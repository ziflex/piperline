import { EventEmitter } from 'events';
import Symbol from 'symbol';
import utils from './utils';

const PIPES = Symbol('PIPES');
const ASSEMBLY = Symbol('ASSEMBLY');

function Assembly(data) {
    this.invoke(data, this.next, this.complete);
}

function Complete(data) {
    this.emit('done', data);
}

class AsyncPipeline extends EventEmitter {
    constructor() {
        super();
        this[PIPES] = [];
    }

    pipe(item) {
        this[PIPES].push(item);
        this[ASSEMBLY] = null;
        return this;
    }

    run(context) {
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
        return new AsyncPipeline();
    }
};
