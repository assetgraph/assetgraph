exports.escapeToCallback = function (cb) {
    return function escapeToCallback(siteGraph) { // Ignore transform stack's callback
        cb(null, siteGraph);
    };
};
