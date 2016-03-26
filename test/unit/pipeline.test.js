/* eslint-disable new-cap, prefer-template */
import chai from 'chai';
import spies from 'chai-spies';
import Pipeline from '../../src/index';
import utils from '../../src/utils';
import { complete as completeTasks } from '../utils';

chai.use(spies);
const should = chai.should();

describe('piperline', () => {
    let line = null;

    beforeEach(() => {
        line = Pipeline.create();
    });

    describe('building', () => {
        it('should execute in order', (done) => {
            let result = '';
            line
                .pipe((data, next) => {
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
                    result.should.be.equal('123');
                    done();
                })
                .run();
        });
    });

    describe('data flow', () => {
        it('should pass down the data', (done) => {
            line
                .pipe((data, next) => {
                    utils.executeAsAsync(() => next(data + '1'));
                })
                .pipe((data, next) => {
                    utils.executeAsAsync(() => next(data + '2'));
                })
                .pipe((data, next, complete) => {
                    utils.executeAsAsync(() => complete(data + '3'));
                })
                .on('done', (data) => {
                    data.should.be.equal('123');
                    done();
                })
                .run('');
        });
    });

    describe('execution', () => {
        it('should be able to run in parallel', (done) => {
            const complete = completeTasks(3, done);

            line
                .pipe((data, next) => utils.executeAsAsync(() => next(data + 1)))
                .pipe((data, next) => utils.executeAsAsync(() => next(data + 2)))
                .pipe((data, next) => utils.executeAsAsync(() => next(data + 3)));

            line.run(0, (err, result) => {
                should.not.exist(err);
                result.should.eql(6);
                complete();
            });

            setTimeout(() => {
                line.run(5, (err, result) => {
                    should.not.exist(err);
                    result.should.eql(11);
                    complete();
                });
            }, 5);

            setTimeout(() => {
                line.run(10, (err, result) => {
                    should.not.exist(err);
                    result.should.eql(16);
                    complete();
                });
            }, 10);
        });

        it('should NOT execute `next()` and `done()` at the same time', (done) => {
            const callbacksCount = 2;
            let callbacks = 0;

            function callback() {
                callbacks += 1;

                if (callbacks === callbacksCount) {
                    done();
                }
            }

            const spy1 = chai.spy((data, next) => {
                utils.executeAsAsync(() => next(data + 1));
            });

            Pipeline.create()
                .pipe((data, next, complete) => {
                    utils.executeAsAsync(() => next(data + 1));
                    utils.executeAsAsync(() => complete(data));
                })
                .pipe(spy1)
                .on('done', (result) => {
                    result.should.be.equal(2);
                    spy1.should.have.been.called.once();
                    callback();
                })
                .on('error', callback)
                .run(0);

            const spy2 = chai.spy((data, next) => {
                utils.executeAsAsync(() => next(data + 1));
            });

            Pipeline.create()
                .pipe((data, next, complete) => {
                    utils.executeAsAsync(() => complete(data));
                    utils.executeAsAsync(() => next(data + 1));
                })
                .pipe(spy2)
                .on('done', (result) => {
                    result.should.be.equal(0);
                    spy2.should.not.have.been.called();
                    callback();
                })
                .on('error', callback)
                .run(0);
        });

        it('should execute `next()` only once per call', (done) => {
            const spy1 = chai.spy((data, next, complete) => {
                utils.executeAsAsync(() => complete(data + 1));
            });

            let result = 0;
            let called = false;

            function callback(data) {
                result += data;
                if (!called) {
                    called = true;

                    setTimeout(() => {
                        result.should.be.equal(2);
                        spy1.should.have.been.called.once();
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

        it('should execute `done()` only once per run', (done) => {
            const spy1 = chai.spy((data, next) => {
                utils.executeAsAsync(() => next(data + 1));
            });

            let result = 0;
            let called = false;

            function callback(data) {
                result += data;
                if (!called) {
                    called = true;

                    setTimeout(() => {
                        result.should.be.equal(1);
                        spy1.should.not.have.been.called();
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

        it('should stop execution', (done) => {
            const spy1 = chai.spy((data, next) => {
                utils.executeAsAsync(() => next(data + 1));
            });

            const spy2 = chai.spy((data, next, complete) => {
                utils.executeAsAsync(() => complete(data + 2));
            });

            const spy3 = chai.spy((data, next) => {
                utils.executeAsAsync(() => next(data + 3));
            });

            line
                .pipe(spy1)
                .pipe(spy2)
                .pipe(spy3)
                .on('done', (data) => {
                    spy1.should.have.been.called();
                    spy2.should.have.been.called();
                    spy3.should.not.have.been.called();
                    data.should.be.equal(3);
                    done();
                })
                .run(0);
        });

        it('should handle errors', (done) => {
            const doneSpy = chai.spy();
            const error = new Error('Test error');

            line
                .pipe((data, next) => {
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
                    err.should.be.equal(error);
                    doneSpy.should.not.have.been.called();
                    done();
                })
                .run(0);
        });

        it('should be able to run multiple times', (done) => {
            const spy1 = chai.spy((data, next) => {
                utils.executeAsAsync(() => next());
            });

            const spy2 = chai.spy((data, next) => {
                utils.executeAsAsync(() => next());
            });

            line
                .pipe(spy1)
                .pipe(spy2)
                .run(0, (err, result) => {
                    should.not.exist(err);
                    line.run(result, () => {
                        done();
                    });
                });
        });

        it('should emit error by passing `Error` object to `complete` callback', (done) => {
            const errSpy = chai.spy();

            line
                .pipe((data, next) => {
                    utils.executeAsAsync(() => next(data));
                })
                .pipe((data, next, complete) => {
                    utils.executeAsAsync(() => complete(new Error('Test error')));
                })
                .on('error', errSpy)
                .run(0, (err, data) => {
                    should.exist(err);
                    should.not.exist(data);

                    setTimeout(() => {
                        errSpy.should.have.been.called();
                        done();
                    }, 10);
                });
        });

        it('should emit error by passing `Error` object to `next` callback and terminate the execution', (done) => {
            const errSpy = chai.spy();
            const spy = chai.spy((data, next) => {
                utils.executeAsAsync(() => next());
            });

            line
                .pipe((data, next) => {
                    utils.executeAsAsync(() => next(new Error('Test error')));
                })
                .pipe((data, next) => {
                    utils.executeAsAsync(() => next(data));
                })
                .pipe(spy)
                .on('error', errSpy)
                .run(0, (err, data) => {
                    should.exist(err);
                    should.not.exist(data);

                    setTimeout(() => {
                        errSpy.should.have.been.called();
                        spy.should.not.have.been.called();
                        done();
                    }, 10);
                });
        });

        it('should terminate the execution if initial data is `Error`', (done) => {
            const errSpy = chai.spy();
            const spy1 = chai.spy((data, next) => {
                utils.executeAsAsync(() => next());
            });

            const spy2 = chai.spy((data, next) => {
                utils.executeAsAsync(() => next());
            });

            const spy3 = chai.spy((data, next) => {
                utils.executeAsAsync(() => next());
            });

            line
                .pipe(spy1)
                .pipe(spy2)
                .pipe(spy3)
                .on('error', errSpy)
                .run(new Error('Test error'), (err, data) => {
                    should.exist(err);
                    should.not.exist(data);

                    setTimeout(() => {
                        errSpy.should.have.been.called();
                        spy1.should.not.have.been.called();
                        spy2.should.not.have.been.called();
                        spy3.should.not.have.been.called();
                        done();
                    }, 10);
                });
        });

        it('should be able to add new pipes', (done) => {
            const spy1 = chai.spy((data, next) => {
                utils.executeAsAsync(() => next(data));
            });

            const spy2 = chai.spy((data, next) => {
                utils.executeAsAsync(() => next(data));
            });

            const spy3 = chai.spy((data, next) => {
                utils.executeAsAsync(() => next(data));
            });

            line
                .pipe(spy1)
                .pipe(spy2)
                .run(() => {
                    line
                        .pipe(spy3)
                        .run((err, data) => {
                            should.not.exist(err);
                            should.not.exist(data);

                            spy1.should.have.been.called.twice();
                            spy2.should.have.been.called.twice();
                            spy3.should.have.been.called.once();

                            done();
                        });
                });
        });

        it('should throw exception when pipes is tried to be added during execution', (done) => {
            const func = () => {
                line.pipe((data, next) => next());
            };

            line
                .pipe((data, next) => {
                    setTimeout(() => next(), 20);
                })
                .run();

            should.throw(func);
            done();
        });

        it('``isRunning`` method should be up to date', (done) => {
            line.isRunning().should.be.equal(false);

            line
                .pipe((data, next) => {
                    setTimeout(() => next(), 20);
                })
                .run(() => {
                    line.isRunning().should.be.equal(false);
                    done();
                });

            line.isRunning().should.be.equal(true);
        });

        it('should throw an error when pipe handler is not a function', () => {
            const handlers = [
                1,
                '1',
                { foo: 'bar' },
                [1],
                null,
                undefined,
                NaN
            ];

            const shouldFail = () => {
                handlers.forEach(x => line.pipe(x));
            };

            shouldFail.should.Throw();
        });

        it('should emit "finish" event when execution completed', (done) => {
            const spy = chai.spy();
            const complete = completeTasks(2, () => {
                spy.should.have.been.called.once();
                done();
            });

            line
                .pipe((data, next) => {
                    utils.executeAsAsync(next);
                })
                .pipe((data, next) => {
                    utils.executeAsAsync(next);
                })
                .on('finish', spy);

            line.run(complete);
            line.run(complete);
        });

        it('should emit "run" when pipeline started', (done) => {
            const spy = chai.spy();
            const complete = completeTasks(2, () => {
                spy.should.have.been.called.once();
                done();
            });

            line
                .pipe((data, next) => {
                    utils.executeAsAsync(next);
                })
                .pipe((data, next) => {
                    utils.executeAsAsync(next);
                })
                .on('run', spy);

            line.run(complete);
            line.run(complete);
        });

        it('should create instance of pipeline with predefiend pipes', (done) => {
            Pipeline.create([
                (data, next) => {
                    utils.executeAsAsync(() => next(data + 1));
                },
                (data, next) => {
                    utils.executeAsAsync(() => next(data + 2));
                }
            ])
                .on('done', (result) => {
                    result.should.eql(3);
                    done();
                })
                .run(0);
        });

        it('should create new pipeline using "clone" method', (done) => {
            const original = Pipeline.create([
                (data, next) => {
                    utils.executeAsAsync(() => next(data + 1));
                },
                (data, next) => {
                    utils.executeAsAsync(() => next(data + 2));
                }
            ]);

            const cloned = original.clone();

            cloned.pipe((data, next) => {
                next(data + 3);
            });

            const complete = completeTasks(2, done);

            original.run(0, (err, result) => {
                should.not.exist(err);
                result.should.eql(3);
                complete();
            });
            cloned.run(0, (err, result) => {
                should.not.exist(err);
                result.should.eql(6);
                complete();
            });
        });
    });
});
