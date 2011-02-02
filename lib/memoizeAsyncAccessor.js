/*global require, module, process*/
module.exports = function memoizeAsyncAccessor(name, computer) {
    return function (cb) {
        var that = this;
        if (name in that) {
            process.nextTick(function () {
                cb(null, that[name]);
            });
        } else {
            var waitingQueuePropertyName = '_' + name + '_queue';
            if (waitingQueuePropertyName in that) {
                that[waitingQueuePropertyName].push(cb);
            } else {
                that[waitingQueuePropertyName] = [cb];
                computer.call(that, function (err, result) {
                    that[name] = result;
                    that[waitingQueuePropertyName].forEach(function (waitingCallback) {
                        waitingCallback(err, result);
                    });
                    delete that[waitingQueuePropertyName];
                });
            }
        }
    };
};
