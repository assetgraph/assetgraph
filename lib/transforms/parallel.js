var _ = require('underscore'),
    step = require('step');

module.exports = function () { // transform1, transform2, ...
    var childTransforms = _.toArray(arguments);
    return function parallel(err, assetGraph, cb) {
        if (err) {
            throw err;
        }
        if (childTransforms.length) {
            step(
                function () {
                    childTransforms.forEach(function (childTransform) {
                        childTransform(null, assetGraph, this.parallel());
                    }, this);
                },
                cb
            );
        } else {
            process.nextTick(cb);
        }
    };
};
