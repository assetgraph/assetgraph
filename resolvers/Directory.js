var URL = require('url'),
    _ = require('underscore');

var Directory = module.exports = function (config) {
    // Expects: config.url
    _.extend(this, config);
};

Directory.prototype = {
    resolve: function (url, cb) {
        var assetConfig = {
            url: URL.parse(this.url.href + '/' + url.pathname)
        };
        process.nextTick(function () {
            cb(null, assetConfig);
        });
    }
};
