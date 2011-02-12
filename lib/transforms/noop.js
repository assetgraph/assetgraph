exports.noop = function () {
    return function noop(assetGraph, cb) {
        process.nextTick(cb);
    };
};
