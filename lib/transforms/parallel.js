var _ = require('underscore'),
    seq = require('seq');

module.exports = function () { // transform1, transform2, ...
    var childTransforms = _.toArray(arguments);
    return function parallel(err, assetGraph, cb) {
        if (err) {
            throw err;
        }
        seq.ap(childTransforms)
            .parEach(function (childTransform) {
                childTransform(null, assetGraph, this);
            })
            .seq(function () {
                cb();
            })
            ['catch'](cb);
    };
};
