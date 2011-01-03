var path = require('path'),
    _ = require('underscore');

var Directory = module.exports = function (config) {
    // Expects: config.url, config.root
    _.extend(this, config);
};

Directory.prototype = {
    resolve: function (pointer, cb) {
        var This = this;
        process.nextTick(function () {
            cb(null, [{
                pointer: pointer,
                url: path.join(This.url, pointer.url)
            }]);
        });
    }
};
