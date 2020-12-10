/* eslint-disable func-names */
/* eslint-disable new-cap, prefer-template, no-unused-expressions */
import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';
import Pipeline from '../../src/index';
import utils from '../../src/utils';
import { complete as completeTasks } from '../utils';

chai.use(sinonChai);

describe('piperline', function () {
    let line = null;

    beforeEach(function () {
        line = Pipeline.create();
    });

    describe('building', function () {
        it('should execute in order', function (done) {
            let result = '';
            line.pipe((data, next) => {
                result += '1';
                utils.executeAsAsync(() => next());
            })
                .pipe((data, next) => {
                    result += '2';
                    utils.executeAsAsync(() => next());
                })
                .pipe((data, next) => {
                    result += '3';
                    utils.executeAsAsync(() => next());
                })
                .on('done', () => {
                    expect(result).be.equal('123');
                    done();
                })
                .run();
        });
    });

    describe('data flow', function () {
        it('should pass down the data', function (done) {
            line.pipe((data, next) => {
                utils.executeAsAsync(() => next(data + '1'));
            })
                .pipe((data, next) => {
                    utils.executeAsAsync(() => next(data + '2'));
                })
                .pipe((data, next, complete) => {
                    utils.executeAsAsync(() => complete(data + '3'));
                })
                .on('done', (data) => {
                    expect(data).be.equal('123');
                    done();
                })
                .run('');
        });
    });

    describe('execution', function () {
        it('should be able to run in parallel', function (done) {
            const complete = completeTasks(3, done);

            line.pipe((data, next) => utils.executeAsAsync(() => next(data + 1)))
                .pipe((data, next) => utils.executeAsAsync(() => next(data + 2)))
                .pipe((data, next) => utils.executeAsAsync(() => next(data + 3)));

            line.run(0, (err, result) => {
                expect(err).not.exist;
                expect(result).eql(6);
                complete();
            });

            setTimeout(() => {
                line.run(5, (err, result) => {
                    expect(err).not.exist;
                    expect(result).eql(11);
                    complete();
                });
            }, 5);

            setTimeout(() => {
                line.run(10, (err, result) => {
                    expect(err).not.exist;
                    expect(result).eql(16);
                    complete();
                });
            }, 10);
        });

        it('should NOT execute `next()` and `done()` at the same time', function (done) {
            const callbacksCount = 2;
            let callbacks = 0;

            function callback() {
                callbacks += 1;

                if (callbacks === callbacksCount) {
                    done();
                }
            }

            const spy1 = sinon.spy((data, next) => {
                utils.executeAsAsync(() => next(data + 1));
            });

            Pipeline.create()
                .pipe((data, next, complete) => {
                    utils.executeAsAsync(() => next(data + 1));
                    utils.executeAsAsync(() => complete(data));
                })
                .pipe(spy1)
                .on('done', (result) => {
                    expect(result).be.equal(2);
                    expect(spy1).have.been.calledOnce;
                    callback();
                })
                .on('error', callback)
                .run(0);

            const spy2 = sinon.spy((data, next) => {
                utils.executeAsAsync(() => next(data + 1));
            });

            Pipeline.create()
                .pipe((data, next, complete) => {
                    utils.executeAsAsync(() => complete(data));
                    utils.executeAsAsync(() => next(data + 1));
                })
                .pipe(spy2)
                .on('done', (result) => {
                    expect(result).be.equal(0);
                    expect(spy2).not.have.been.called;
                    callback();
                })
                .on('error', callback)
                .run(0);
        });

        it('should execute `next()` only once per call', function (done) {
            const spy1 = sinon.spy((data, next, complete) => {
                utils.executeAsAsync(() => complete(data + 1));
            });

            let result = 0;
            let called = false;

            function callback(data) {
                result += data;
                if (!called) {
                    called = true;

                    setTimeout(() => {
                        expect(result).be.equal(2);
                        expect(spy1).have.been.calledOnce;
                        done();
                    }, 20);
                }
            }

            Pipeline.create()
                .pipe((data, next) => {
                    utils.executeAsAsync(() => next(data + 1));
                    utils.executeAsAsync(() => next(data + 1));
                })
                .pipe(spy1)
                .on('done', callback)
                .run(0);
        });

        it('should execute `done()` only once per run', function (done) {
            const spy1 = sinon.spy((data, next) => {
                utils.executeAsAsync(() => next(data + 1));
            });

            let result = 0;
            let called = false;

            function callback(data) {
                result += data;
                if (!called) {
                    called = true;

                    setTimeout(() => {
                        expect(result).be.equal(1);
                        expect(spy1).not.have.been.called;
                        done();
                    }, 20);
                }
            }

            Pipeline.create()
                .pipe((data, next, complete) => {
                    utils.executeAsAsync(() => complete(data + 1));
                    utils.executeAsAsync(() => complete(data + 1));
                })
                .pipe(spy1)
                .on('done', callback)
                .run(0);
        });

        it('should call passed callback only once when error occured during execution', function (done) {
            const callback = sinon.spy();

            const pipeline = Pipeline.create().pipe((data, next, complete) => {
                complete(new Error('pipe'));
                throw new Error('callback');
            });

            pipeline.run({}, () => {
                callback();
            });

            setTimeout(() => {
                expect(callback).have.been.calledOnce;
                done();
            }, 10);
        });

        it('should stop execution', function (done) {
            const spy1 = sinon.spy((data, next) => {
                utils.executeAsAsync(() => next(data + 1));
            });

            const spy2 = sinon.spy((data, next, complete) => {
                utils.executeAsAsync(() => complete(data + 2));
            });

            const spy3 = sinon.spy((data, next) => {
                utils.executeAsAsync(() => next(data + 3));
            });

            line.pipe(spy1)
                .pipe(spy2)
                .pipe(spy3)
                .on('done', (data) => {
                    expect(spy1).have.been.called;
                    expect(spy2).have.been.called;
                    expect(spy3).not.have.been.called;
                    expect(data).be.equal(3);
                    done();
                })
                .run(0);
        });

        it('should handle errors', function (done) {
            const doneSpy = sinon.spy();
            const error = new Error('Test error');

            line.pipe((data, next) => {
                utils.executeAsAsync(() => next(data + 1));
            })
                .pipe(() => {
                    throw error;
                })
                .pipe((data, next) => {
                    utils.executeAsAsync(() => next(data + 1));
                })
                .on('done', doneSpy)
                .on('error', (err) => {
                    expect(err).be.equal(error);
                    expect(doneSpy).not.have.been.called;
                    done();
                })
                .run(0);
        });

        it('should be able to run multiple times', function (done) {
            const spy1 = sinon.spy((data, next) => {
                utils.executeAsAsync(() => next());
            });

            const spy2 = sinon.spy((data, next) => {
                utils.executeAsAsync(() => next());
            });

            line.pipe(spy1)
                .pipe(spy2)
                .run(0, (err, result) => {
                    expect(err).not.exist;
                    line.run(result, () => {
                        done();
                    });
                });
        });

        it('should emit error by passing `Error` object to `complete` callback', function (done) {
            const errSpy = sinon.spy();

            line.pipe((data, next) => {
                utils.executeAsAsync(() => next(data));
            })
                .pipe((data, next, complete) => {
                    utils.executeAsAsync(() => complete(new Error('Test error')));
                })
                .on('error', errSpy)
                .run(0, (err, data) => {
                    expect(err).exist;
                    expect(data).not.exist;

                    setTimeout(() => {
                        expect(errSpy).have.been.called;
                        done();
                    }, 10);
                });
        });

        it('should emit error by passing `Error` object to `next` callback and terminate the execution', function (done) {
            const errSpy = sinon.spy();
            const spy = sinon.spy((data, next) => {
                utils.executeAsAsync(() => next());
            });

            line.pipe((data, next) => {
                utils.executeAsAsync(() => next(new Error('Test error')));
            })
                .pipe((data, next) => {
                    utils.executeAsAsync(() => next(data));
                })
                .pipe(spy)
                .on('error', errSpy)
                .run(0, (err, data) => {
                    expect(err).exist;
                    expect(data).not.exist;

                    setTimeout(() => {
                        expect(errSpy).have.been.called;
                        expect(spy).not.have.been.called;
                        done();
                    }, 10);
                });
        });

        it('should terminate the execution if initial data is `Error`', function (done) {
            const errSpy = sinon.spy();
            const spy1 = sinon.spy((data, next) => {
                utils.executeAsAsync(() => next());
            });

            const spy2 = sinon.spy((data, next) => {
                utils.executeAsAsync(() => next());
            });

            const spy3 = sinon.spy((data, next) => {
                utils.executeAsAsync(() => next());
            });

            line.pipe(spy1)
                .pipe(spy2)
                .pipe(spy3)
                .on('error', errSpy)
                .run(new Error('Test error'), (err, data) => {
                    expect(err).exist;
                    expect(data).not.exist;

                    setTimeout(() => {
                        expect(errSpy).have.been.called;
                        expect(spy1).not.have.been.called;
                        expect(spy2).not.have.been.called;
                        expect(spy3).not.have.been.called;
                        done();
                    }, 10);
                });
        });

        it('should be able to add new pipes', function (done) {
            const spy1 = sinon.spy((data, next) => {
                utils.executeAsAsync(() => next(data));
            });

            const spy2 = sinon.spy((data, next) => {
                utils.executeAsAsync(() => next(data));
            });

            const spy3 = sinon.spy((data, next) => {
                utils.executeAsAsync(() => next(data));
            });

            line.pipe(spy1)
                .pipe(spy2)
                .run(() => {
                    line.pipe(spy3).run((err, data) => {
                        expect(err).not.exist;
                        expect(data).not.exist;

                        expect(spy1).have.been.calledTwice;
                        expect(spy2).have.been.calledTwice;
                        expect(spy3).have.been.calledOnce;

                        done();
                    });
                });
        });

        it('should throw exception when pipes is tried to be added during execution', function (done) {
            const func = () => {
                line.pipe((data, next) => next());
            };

            line.pipe((data, next) => {
                setTimeout(() => next(), 20);
            }).run();

            expect(func).throw;
            done();
        });

        it('``isRunning`` method should be up to date', function (done) {
            expect(line.isRunning()).to.be.equal(false);

            line.pipe((data, next) => {
                setTimeout(() => next(), 20);
            }).run(() => {
                expect(line.isRunning()).be.equal(false);
                done();
            });

            expect(line.isRunning()).be.equal(true);
        });

        it('should throw an error when pipe handler is not a function', function () {
            const handlers = [1, '1', { foo: 'bar' }, [1], null, undefined, NaN];

            const shouldFail = () => {
                handlers.forEach((x) => line.pipe(x));
            };

            expect(shouldFail).Throw();
        });

        it('should emit "finish" event when execution completed', function (done) {
            const spy = sinon.spy();
            const complete = completeTasks(2, () => {
                expect(spy).to.have.been.calledOnce;
                done();
            });

            line.pipe((data, next) => {
                utils.executeAsAsync(next);
            })
                .pipe((data, next) => {
                    utils.executeAsAsync(next);
                })
                .on('finish', spy);

            line.run(complete);
            line.run(complete);
        });

        it('should emit "run" when pipeline started', function (done) {
            const spy = sinon.spy();
            const complete = completeTasks(2, () => {
                expect(spy).to.have.been.calledOnce;
                done();
            });

            line.pipe((data, next) => {
                utils.executeAsAsync(next);
            })
                .pipe((data, next) => {
                    utils.executeAsAsync(next);
                })
                .on('run', spy);

            line.run(complete);
            line.run(complete);
        });

        it('should create instance of pipeline with predefiend pipes', function (done) {
            Pipeline.create([
                (data, next) => {
                    utils.executeAsAsync(() => next(data + 1));
                },
                (data, next) => {
                    utils.executeAsAsync(() => next(data + 2));
                },
            ])
                .on('done', (result) => {
                    expect(result).eql(3);
                    done();
                })
                .run(0);
        });

        it('should create new pipeline using "clone" method', function (done) {
            const original = Pipeline.create([
                (data, next) => {
                    utils.executeAsAsync(() => next(data + 1));
                },
                (data, next) => {
                    utils.executeAsAsync(() => next(data + 2));
                },
            ]);

            const cloned = original.clone();

            cloned.pipe((data, next) => {
                next(data + 3);
            });

            const complete = completeTasks(2, done);

            original.run(0, (err, result) => {
                expect(err).not.exist;
                expect(result).eql(3);
                complete();
            });
            cloned.run(0, (err, result) => {
                expect(err).not.exist;
                expect(result).eql(6);
                complete();
            });
        });

        it('should not fail if empty', function (done) {
            expect(() => {
                Pipeline.create().run('foo', (err, data) => {
                    expect(err).not.exist;
                    expect(data).exist;
                    done();
                });
            }).not.throw();
        });
    });
});
