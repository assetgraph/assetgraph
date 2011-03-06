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

error.throwException = function (successCallback) {
    return function (err) { // ...
        if (err) {
            if (!(err instanceof Error)) {
                err = new Error(err);
            }
            Error.captureStackTrace(err);
            throw err;
        } else if (successCallback) {
            successCallback.apply(this, [].slice.call(arguments, 1));
        }
    };
};

error.logAndExit = function (successCallback) {
    return error.passToFunction(function (err) {
        console.log(err.stack);
        process.exit();
    }, successCallback);
};

error.onlyCallOnce = function (wrappedFunction) {
    var called = false;
    return function () { // ...
        if (!called) {
            called = true;
            wrappedFunction.apply(this, arguments);
        }
    };
};
