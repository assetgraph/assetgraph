module.exports = function extendDefined(target) { // ...
    for (var i = 1 ; i < arguments.length ; i += 1) {
        var source = arguments[i];
        for (var key in source) {
            if (typeof source[key] !== 'undefined') {
                target[key] = source[key];
            }
        }
    }
    return target;
};
