var _ = require('underscore');

exports.serial = function () { // transform1, transform2, ...
    var childTransforms = _.toArray(arguments);
    return function serial(err, assetGraph, cb) {
        var nextTransformIndex = 0;
        function proceed() {
            if (nextTransformIndex < childTransforms.length) {
                var nextTransform = childTransforms[nextTransformIndex];
                nextTransformIndex += 1; // Don't break if nextTransform invokes callback in same tick
                nextTransform(assetGraph, proceed);
            } else {
                process.nextTick(cb);
            }
        }
        proceed();
    };
};
