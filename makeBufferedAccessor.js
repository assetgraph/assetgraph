/*global require, module, process*/
module.exports = function makeBufferedAccessor(name, computer) {
    return function (cb) {
        var that = this;
        if (name in this) {
            process.nextTick(function () {
                cb(null, that[name]);
            });
        } else {
            var waitingQueuePropertyName = '_' + name + '_queue';
            if (waitingQueuePropertyName in this) {
                this[waitingQueuePropertyName].push(cb);
            } else {
                this[waitingQueuePropertyName] = [cb];
                computer.call(this, function (err, result) {
                    this[name] = result;
                    that[waitingQueuePropertyName].forEach(function (waitingCallback) {
                        waitingCallback(err, result);
                    });
                    delete this[waitingQueuePropertyName];
                });
            }
        }
    };
};
