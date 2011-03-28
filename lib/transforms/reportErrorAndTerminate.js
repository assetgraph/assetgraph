module.exports = function () {
    return function reportErrorAndTerminate(err, assetGraph, cb) {
        if (err) {
            console.error(err.stack);
            process.exit(1);
        } else {
            process.nextTick(cb);
        }
    };
};
