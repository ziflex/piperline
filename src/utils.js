import bind from 'lodash._basebind';

export default {
    executeAsAsync(handler) {
        if (process) {
            process.nextTick(handler);
        } else {
            setTimeout(handler, 4);
        }
    },

    bindFunc(func, thisArg, ...args) {
        return bind([func, null, args, null, thisArg]);
    },

    isFunction(target) {
        return typeof target === 'function';
    },

    isError(target) {
        return target instanceof Error;
    }
};
