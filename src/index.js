import EventEmitter from 'eventemitter3';
import isCallable from 'is-callable';
import utils from './utils';

const FIELDS = {
    emitter: Symbol('emitter'),
    pipes: Symbol('pipes'),
    assembly: Symbol('assembly'),
    counter: Symbol('counter'),
};

const METHODS = {
    complete: Symbol('complete'),
};

function createPipe(handler, next) {
    return function pipe(data, complete) {
        // Terminates the execution if data is `Error` object.
        if (utils.isError(data)) {
            complete(data);
            return;
        }

        let executed = false;

        try {
            handler(
                data,
                function onNext(result) {
                    if (executed) {
                        return;
                    }

                    executed = true;

                    if (next) {
                        next(result, complete);
                        return;
                    }

                    complete(result);
                },
                function onComplete(result) {
                    if (executed) {
                        return;
                    }

                    executed = true;
                    complete(result);
                },
            );
        } catch (err) {
            if (executed) {
                return;
            }

            complete(err);
        }
    };
}

class Pipeline {
    constructor(pipes) {
        this[FIELDS.emitter] = new EventEmitter();
        this[FIELDS.pipes] = [];
        this[FIELDS.counter] = 0;
        this[METHODS.complete] = function Complete(result, callback) {
            let error = null;
            let data = result;

            if (utils.isError(result)) {
                error = result;
                data = null;
            }

            const eventName = !error ? 'done' : 'error';
            const eventArgs = error || data;

            this[FIELDS.emitter].emit(eventName, eventArgs);
            this[FIELDS.counter] -= 1;

            if (this[FIELDS.counter] === 0) {
                this[FIELDS.emitter].emit('finish');
            }

            if (isCallable(callback)) {
                callback(error, data);
            }
        };

        if (pipes) {
            const len = pipes.length;
            for (let i = 0; i < len; i += 1) {
                this.pipe(pipes[i]);
            }
        }
    }

    on(...args) {
        this[FIELDS.emitter].on(...args);
        return this;
    }

    once(...args) {
        this[FIELDS.emitter].once(...args);
        return this;
    }

    off(...args) {
        this[FIELDS.emitter].off(...args);
        return this;
    }

    isRunning() {
        return this[FIELDS.counter] > 0;
    }

    clone() {
        return new Pipeline(this[FIELDS.pipes].slice(0));
    }

    pipe(handler) {
        utils.assert('"handler" must be a function.', isCallable(handler));
        utils.assert('Pipeline can not be changed during execution.', !this.isRunning());

        this[FIELDS.pipes].push(handler);
        this[FIELDS.assembly] = null;
        return this;
    }

    run(...args) {
        let [data, callback] = args;

        if (isCallable(data)) {
            callback = data;
            data = null;
        }

        this[FIELDS.isRunning] = true;

        const complete = (result) => this[METHODS.complete](result, callback);

        if (!this[FIELDS.assembly]) {
            const pipes = this[FIELDS.pipes];
            const len = pipes.length;
            let assembly = null;
            let i;

            for (i = len - 1; i >= 0; i -= 1) {
                const pipe = pipes[i];
                if (pipe) {
                    assembly = createPipe(pipe, assembly);
                }
            }

            this[FIELDS.assembly] = assembly;
        }

        if (this[FIELDS.counter] === 0) {
            this[FIELDS.emitter].emit('run');
        }

        this[FIELDS.counter] += 1;

        utils.executeAsAsync(() => {
            try {
                const asm = this[FIELDS.assembly];

                if (!asm) {
                    complete(data);
                    return;
                }

                asm(data, complete);
            } catch (ex) {
                complete(ex);
            }
        });

        return this;
    }
}

module.exports = {
    create(...args) {
        return new Pipeline(...args);
    },
};
