exports.escapeToCallback = function escapeToCallback(cb) {
    return function (siteGraph) { // Ignore transform stack's callback
        cb(null, siteGraph);
    };
};
