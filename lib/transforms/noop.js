module.exports = function () {
    return function noop(err, assetGraph, cb) {
        if (err) {
            throw err;
        }
        process.nextTick(cb);
    };
};
