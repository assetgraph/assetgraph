var URL = require('url'),
    _ = require('underscore');

var Directory = module.exports = function (config) {
    // Expects: config.url
    _.extend(this, config);
};

Directory.prototype = {
    resolve: function (labelRelativePath, cb) {
        var assetConfig = {
            url: this.url + '/' + labelRelativePath
        };
        process.nextTick(function () {
            cb(null, assetConfig);
        });
    }
};
