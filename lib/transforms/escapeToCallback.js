exports.escapeToCallback = function (cb) {
    return function escapeToCallback(assetGraph) { // Ignore transform stack's callback
        cb(null, assetGraph);
    };
};
