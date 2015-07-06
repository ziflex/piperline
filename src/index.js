import { EventEmitter } from 'events';
import Symbol from 'symbol';
import utils from './utils';

const PIPES = Symbol('PIPES');
const ASSEMBLY = Symbol('ASSEMBLY');
const RUNNING = Symbol('RUNNING');

function Assembly(data) {
    const context = { done: false };

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

function Start() {
    this[RUNNING] = true;
}

function End() {
    this[RUNNING] = false;
}

function Complete(data) {
    End.apply(this);
    this.emit('done', data);
}

class Pipeline extends EventEmitter {
    constructor() {
        super();
        this[PIPES] = [];
        this[RUNNING] = false;
    }

    pipe(item) {
        this[PIPES].push(item);
        this[ASSEMBLY] = null;
        return this;
    }

    run(context) {
        if (this[RUNNING]) {
            throw new Error('Tasks already are running');
        }

        Start.apply(this);

        const complete = utils.bindFunc(Complete, this);

        if (!this[ASSEMBLY]) {
            let assembly = complete;
            const pipes = this[PIPES];
            const len = pipes.length;
            let i;

            for (i = len - 1; i >= 0; i -= 1) {
                const pipe = pipes[i];
                if (pipe) {
                    assembly = utils.bindFunc(Assembly, {
                        invoke: pipe,
                        next: assembly,
                        complete: complete
                    });
                }
            }

            this[ASSEMBLY] = assembly;
        }

        utils.executeAsAsync(utils.bindFunc(function Run(sym, ctx, completeRun) {
            try {
                this[sym](ctx, completeRun);
            } catch(ex) {
                this.emit('error', ex);
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
