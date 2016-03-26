export function complete(tasks, done) {
    let counter = 0;
    return function tryToComplete() {
        counter += 1;

        if (counter === tasks) {
            done();
        }
    };
}
