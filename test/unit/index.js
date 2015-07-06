import pipeline from '../../src/index';
import chai from 'chai';
import spies from 'chai-spies';

chai.use(spies);
chai.should();

describe('piperline', () => {
    let line = null;

    beforeEach(() => {
        line = pipeline.create();
    });

    describe('building', function MainUnit() {
        it('should execute in order', (done) => {
            let result = '';
            line
                .pipe((data, next) => {
                    result += '1';
                    next();
                })
                .pipe((data, next) => {
                    result += '2';
                    next();
                })
                .pipe((data, next) => {
                    result += '3';
                    next();
                })
                .on('done', () => {
                    result.should.be.equal('123');
                    done();
                })
                .run();
        });
    });

    describe('data flow', function DataFlowUnit() {
        it('should pass down the data', (done) => {
            line
                .pipe((data, next) => {
                    next(data + 1);
                })
                .pipe((data, next) => {
                    next(data + 1);
                })
                .pipe((data, next, complete) => {
                    complete(data + 1);
                })
                .on('done', (data) => {
                    data.should.be.equal(3);
                    done();
                })
                .run(0);
        });
    });

    describe('execution', function ExecutionUnit() {
        it('should NOT run until the previous execution completed', (done) => {
            function ShouldFail() {
                line
                    .pipe((data, next) => next(data))
                    .pipe((data, next) => next(data))
                    .pipe((data, next) => next(data));

                line.run(0);
                line.run(0);
            }

            ShouldFail.should.Throw();
            done();
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
                next(data + 1);
            });

            pipeline.create()
                .pipe((data, next, complete) => {
                    next(data + 1);
                    complete(data);
                })
                .pipe(spy1)
                .on('done', (result) => {
                    result.should.be.equal(1);
                    spy1.should.not.have.been.called();
                    callback();
                })
                .on('error', callback)
                .run(0);

            const spy2 = chai.spy((data, next) => {
                next(data + 1);
            });

            pipeline.create()
                .pipe((data, next, complete) => {
                    complete(data);
                    next(data + 1);
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
                complete(data + 1);
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
                    }, 100);
                }
            }

            pipeline.create()
                .pipe((data, next) => {
                    next(data + 1);
                    next(data + 1);
                })
                .pipe(spy1)
                .on('done', callback)
                .run(0);
        });

        it('should execute `done()` only once per run', (done) => {
            const spy1 = chai.spy((data, next) => {
                next(data + 1);
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
                    }, 100);
                }
            }

            pipeline.create()
                .pipe((data, next, complete) => {
                    complete(data + 1);
                    complete(data + 1);
                })
                .pipe(spy1)
                .on('done', callback)
                .run(0);
        });

        it('should stop execution', (done) => {
            const spy1 = chai.spy((data, next) => {
                next(data + 1);
            });

            const spy2 = chai.spy((data, next, complete) => {
                complete(data + 2);
            });

            const spy3 = chai.spy((data, next) => {
                next(data + 3);
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
                    next(data + 1);
                })
                .pipe(() => {
                    throw error;
                })
                .pipe((data, next) => {
                    next(data + 1);
                })
                .on('done', doneSpy)
                .on('error', (err) => {
                    err.should.be.equal(error);
                    doneSpy.should.not.have.been.called();
                    done();
                })
                .run(0);
        });
    });
});
