exports.noop = function () {
    return function noop(err, assetGraph, cb) {
        process.nextTick(cb);
    };
};
