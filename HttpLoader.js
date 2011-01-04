var FsLoader = require('./FsLoader'),
    util = require('util'),
    sys = require('sys'),
    fs = require('fs'),
    path = require('path'),
    step = require('step'),
    _ = require('underscore'),
    assets = require('./assets'),
    error = require('./error'),
    request = require('request');

var HttpLoader = module.exports = function (config) {
    FsLoader.apply(this, arguments);
};

util.inherits(HttpLoader, FsLoader);

_.extend(HttpLoader.prototype, {
    resolveAssetConfig: function (assetConfig, baseUrl, cb) {
        process.nextTick(function () {
            cb(null, [assetConfig]);
        });
    },

    getSrcProxy: function (assetConfig) {
        var This = this;
        return function (cb) {
            request({
                uri: This.root + assetConfig.url
            }, function (err, response, body) {
                console.log("GET "+ This.root + assetConfig.url + " => " + response.statusCode);

                if (response.statusCode >= 400) {
                    err = new Error("Got " + response.statusCode + " from remote server!");
                }
                cb(err, body);
            });
        };
    }
});
