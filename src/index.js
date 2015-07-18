import { EventEmitter } from 'events';
import Symbol from 'es6-symbol';
import utils from './utils';

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

class Pipeline extends EventEmitter {
    constructor() {
        super();
        this[PIPES] = [];
        this[RUNNING] = false;
        this[PENDING_CALLBACK] = null;
        this[COMPLETE] = utils.bindFunc(function Complete(result) {
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

            if (utils.isFunction(callback)) {
                callback(error, data);
            }

            this.emit(eventName, eventArgs);
        }, this);
    }

    get isRunning() {
        return this[RUNNING];
    }

    pipe(item) {
        if (this[RUNNING]) {
            throw new Error('Pipeline can not be changed during the run.');
        }

        this[PIPES].push(item);
        this[ASSEMBLY] = null;
        return this;
    }

    run(...args) {
        if (this[RUNNING]) {
            throw new Error('Tasks already are running');
        }

        let [context, callback] = args;

        if (utils.isFunction(context)) {
            callback = context;
            context = null;
        }

        this[RUNNING] = true;
        this[PENDING_CALLBACK] = callback;

        const complete = utils.bindFunc(this[COMPLETE], this);

        if (!this[ASSEMBLY]) {
            let assembly = complete;
            const pipes = this[PIPES];
            const len = pipes.length;
            let i;

            for (i = len - 1; i >= 0; i -= 1) {
                const pipe = pipes[i];
                if (pipe) {
                    assembly = utils.bindFunc(execution, {
                        invoke: pipe,
                        next: assembly,
                        complete: complete
                    });
                }
            }

            this[ASSEMBLY] = assembly;
        }

        utils.executeAsAsync(utils.bindFunc(function Run(sym, ctx, done) {
            try {
                this[sym](ctx, done);
            } catch(ex) {
                done(ex);
            }
        }, this, ASSEMBLY, context, complete));

        return this;
    }
}

export default {
    create() {
        return new Pipeline();
    }
};
