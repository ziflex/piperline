import { EventEmitter } from 'events';
import Symbol from 'symbol';
import utils from './utils';

const PIPES = Symbol('PIPES');
const ASSEMBLY = Symbol('ASSEMBLY');
const RUNNING = Symbol('RUNNING');
const PENDING_CALLBACK = Symbol('PENDING_CALLBACK');
const COMPLETE = Symbol('COMPLETE');

function Assembly(data) {
    const context = { done: false };

    // Terminate the execution if data is `Error` object.
    if (utils.isError(data)) {
        this.complete(data);
    }

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
}

class Pipeline extends EventEmitter {
    constructor() {
        super();
        this[PIPES] = [];
        this[RUNNING] = false;
        this[PENDING_CALLBACK] = null;
        this[COMPLETE] = utils.bindFunc(function Complete(err, data) {
            let error = err;

            if (!err && utils.isError(data)) {
                error = data;
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

        const onSuccess = utils.bindFunc(function onSuccess(data) {
            this[COMPLETE](null, data);
        }, this);

        const onFailure = utils.bindFunc(function onFailure(err) {
            this[COMPLETE](err, null);
        }, this);

        if (!this[ASSEMBLY]) {
            let assembly = onSuccess;
            const pipes = this[PIPES];
            const len = pipes.length;
            let i;

            for (i = len - 1; i >= 0; i -= 1) {
                const pipe = pipes[i];
                if (pipe) {
                    assembly = utils.bindFunc(Assembly, {
                        invoke: pipe,
                        next: assembly,
                        complete: onSuccess
                    });
                }
            }

            this[ASSEMBLY] = assembly;
        }

        utils.executeAsAsync(utils.bindFunc(function Run(sym, ctx, success, failure) {
            try {
                this[sym](ctx, success);
            } catch(ex) {
                failure(ex);
            }
        }, this, ASSEMBLY, context, onSuccess, onFailure));

        return this;
    }
}

export default {
    create() {
        return new Pipeline();
    }
};
