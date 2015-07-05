import pipeline from '../../src/index';
import chai from 'chai';
import spies from 'chai-spies';

chai.use(spies);
chai.should();

describe('piperline', () => {
    describe('building', function MainUnit() {
        let line = null;

        beforeEach(() => {
            line = pipeline.create();
        });

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

        it('should pass down the data', (done) => {
            line
                .pipe((data, next) => {
                    next(data + 1);
                })
                .pipe((data, next) => {
                    next(data + 1);
                })
                .pipe((data, next) => {
                    next(data + 1);
                })
                .on('done', (data) => {
                    data.should.be.equal(3);
                    done();
                })
                .run(0);
        });

        it('should stop processing', (done) => {
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
