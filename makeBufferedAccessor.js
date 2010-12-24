/*global require, module, process*/
var _ = require('underscore');

module.exports = function makeBufferedAccessor(name, computer) {
    return function (cb) {
        var accessorInfo = this[name];
        if (!accessorInfo) {
            accessorInfo = this[name] = {
                waitingCallbacks: [cb]
            };
            computer.call(this, function () { // ...
                accessorInfo.resultArray = _.toArray(arguments);
                accessorInfo.waitingCallbacks.forEach(function (waitingCallback) {
                    waitingCallback.apply(this, accessorInfo.resultArray);
                });
                delete accessorInfo.waitingCallbacks;
            });
        } else if (accessorInfo.resultArray) {
            process.nextTick(function () {
                cb.apply(this, accessorInfo.resultArray);
            });
        } else if (accessorInfo.waitingCallbacks) {
            // Value is already being computed
            accessorInfo.waitingCallbacks.push(cb);
        } else {
            throw new Error("Accessor is in an invalid state");
        }
    };
};
