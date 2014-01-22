module.exports = function (targetObj) {
    for (var i = 1 ; i < arguments.length ; i += 1) {
        var sourceObj = arguments[i];
        Object.keys(sourceObj).forEach(function (propertyName) {
            var getter = sourceObj.__lookupGetter__(propertyName),
                setter = sourceObj.__lookupSetter__(propertyName);
            if (getter || setter) {
                if (getter) {
                    targetObj.__defineGetter__(propertyName, getter);
                }
                if (setter) {
                    targetObj.__defineSetter__(propertyName, setter);
                }
            } else if (sourceObj[propertyName] !== void 0) {
                targetObj[propertyName] = sourceObj[propertyName];
            }
        });
    }
    return targetObj;
};
