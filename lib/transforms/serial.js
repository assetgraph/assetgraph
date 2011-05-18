var _ = require('underscore');

module.exports = function () { // transform1, transform2, ...
    var childTransforms = _.toArray(arguments).filter(function (transform) {
        return transform; // Ignore the falsy ones
    });
    return function serial(err, assetGraph, cb) {
        if (err) {
            throw err;
        }
        var nextTransformIndex = 0;
        function proceed() {
            if (nextTransformIndex < childTransforms.length) {
                var nextTransform = childTransforms[nextTransformIndex];
                nextTransformIndex += 1; // Don't break if nextTransform invokes callback in same tick
                nextTransform(null, assetGraph, proceed);
            } else {
                process.nextTick(cb);
            }
        }
        proceed();
    };
};
