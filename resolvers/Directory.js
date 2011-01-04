var path = require('path'),
    _ = require('underscore');

var Directory = module.exports = function (config) {
    // Expects: config.url, config.root
    _.extend(this, config);
};

Directory.prototype = {
    resolve: function (assetConfig, label, baseUrl, cb) {
        assetConfig.url = path.join(this.url, assetConfig.url);
        process.nextTick(function () {
            cb(null, [assetConfig]);
        });
    }
};
