const utils = {
    executeAsAsync(handler) {
        if (process) {
            process.nextTick(handler);
        } else {
            setTimeout(handler, 0);
        }
    },

    isError(target) {
        return target instanceof Error;
    },

    assert(msg, condition) {
        if (!condition) {
            throw new Error(msg);
        }
    }
};

export default utils;
