var _ = require('underscore'),
    seq = require('seq');

module.exports = function () { // transform1, transform2, ...
    var childTransforms = _.toArray(arguments).filter(function (transform) {
        return transform; // Ignore the falsy ones
    });

    return function parallel(assetGraph, cb) {
        seq(childTransforms)
            .parEach(function (childTransform) {
                assetGraph.runTransform(childTransform, this);
            })
            .seq(function () {
                cb();
            })
            ['catch'](cb);
    };
};
