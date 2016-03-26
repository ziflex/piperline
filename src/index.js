import EventEmitter from 'eventemitter3';
import Symbol from 'es6-symbol';
import isCallable from 'is-callable';
import utils from './utils';

const EMITTER = Symbol('EMITTER');
const PIPES = Symbol('PIPES');
const ASSEMBLY = Symbol('ASSEMBLY');
const RUNNING = Symbol('RUNNING');
const PENDING_CALLBACK = Symbol('PENDING_CALLBACK');
const COMPLETE = Symbol('COMPLETE');

function execution(data) {
    // Terminates the execution if data is `Error` object.
    if (utils.isError(data)) {
        this.complete(data);
        return;
    }

    utils.executeAsAsync(() => {
        const context = { done: false };

        try {
            this.invoke(data, (result) => {
                if (!context.done) {
                    context.done = true;
                    this.next(result);
                }
            }, (result) => {
                if (!context.done) {
                    context.done = true;
                    this.complete(result);
                }
            });
        } catch (ex) {
            this.complete(ex);
        }
    });
}

class Pipeline {
    constructor(pipes) {
        this[EMITTER] = new EventEmitter();
        this[PIPES] = [];
        this[RUNNING] = false;
        this[PENDING_CALLBACK] = null;
        this[COMPLETE] = function Complete(result) {
            let error = null;
            let data = result;

            if (utils.isError(result)) {
                error = result;
                data = null;
            }

            const callback = this[PENDING_CALLBACK];
            const eventName = !error ? 'done' : 'error';
            const eventArgs = error || data;

            this[RUNNING] = false;

            if (isCallable(callback)) {
                callback(error, data);
            }

            this[EMITTER].emit(eventName, eventArgs);
            this[EMITTER].emit('end', error, data);
        }.bind(this);

        if (pipes) {
            const len = pipes.length;
            for (let i = 0; i < len; i += 1) {
                this.pipe(pipes[i]);
            }
        }
    }

    on(...args) {
        this[EMITTER].on(...args);
        return this;
    }

    once(...args) {
        this[EMITTER].once(...args);
        return this;
    }

    off(...args) {
        this[EMITTER].off(...args);
        return this;
    }

    get isRunning() {
        return this[RUNNING];
    }

    clone() {
        return new Pipeline(this[PIPES].slice(0));
    }

    pipe(handler) {
        utils.assert('"handler" must be a function.', isCallable(handler));
        utils.assert('Pipeline can not be changed during the run.', !this[RUNNING]);

        this[PIPES].push(handler);
        this[ASSEMBLY] = null;
        return this;
    }

    run(...args) {
        utils.assert('Tasks already are running.', !this[RUNNING]);

        let [context, callback] = args;

        if (isCallable(context)) {
            callback = context;
            context = null;
        }

        this[RUNNING] = true;
        this[PENDING_CALLBACK] = callback;

        const complete = this[COMPLETE];

        if (!this[ASSEMBLY]) {
            let assembly = complete;
            const pipes = this[PIPES];
            const len = pipes.length;
            let i;

            for (i = len - 1; i >= 0; i -= 1) {
                const pipe = pipes[i];
                if (pipe) {
                    assembly = execution.bind({
                        invoke: pipe,
                        next: assembly,
                        complete
                    });
                }
            }

            this[ASSEMBLY] = assembly;
        }

        this[EMITTER].emit('run');

        utils.executeAsAsync(function Run(asm, ctx, done) {
            try {
                asm(ctx, done);
            } catch (ex) {
                done(ex);
            }
        }.bind(this, this[ASSEMBLY], context, complete));

        return this;
    }
}

module.exports = {
    create(...args) {
        return new Pipeline(...args);
    }
};
