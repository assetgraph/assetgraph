/*global module*/
var error = module.exports = {};

error.passToFunction = function (next, successCallback) {
    return function (err) { // ...
        if (err) {
            next(err);
        } else if (successCallback) {
            successCallback.apply(this, [].slice.call(arguments, 1));
        }
    };
};
