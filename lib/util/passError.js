/*global module*/

module.exports = function passError(errorCallback, successCallback) {
    return function (err) { // ...
        if (err) {
            errorCallback(err);
        } else if (successCallback) {
            successCallback.apply(this, [].slice.call(arguments, 1));
        }
    };
};
