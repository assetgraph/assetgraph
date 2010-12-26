/*global require, module, process*/
module.exports = function makeBufferedAccessor(name, computer) {
    return function (cb) {
        var This = this;
        if (name in this) {
            process.nextTick(function () {
                cb(null, This[name]);
            });
        } else {
            var waitingQueuePropertyName = '_' + name + '_queue';
            if (waitingQueuePropertyName in this) {
                this[waitingQueuePropertyName].push(cb);
            } else {
                this[waitingQueuePropertyName] = [cb];
                computer.call(this, function (err, result) {
                    this[name] = result;
                    This[waitingQueuePropertyName].forEach(function (waitingCallback) {
                        waitingCallback(err, result);
                    });
                    delete this[waitingQueuePropertyName];
                });
            }
        }
    };
};
