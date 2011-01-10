var util = require('util'),
    sys = require('sys'),
    fs = require('fs'),
    path = require('path'),
    step = require('step'),
    _ = require('underscore'),
    request = require('request'),
    assets = require('../assets'),
    error = require('../error'),
    Base = require('./Base');

var Http = module.exports = function (config) {
    Base.apply(this, arguments);
};

util.inherits(Http, Base);

_.extend(Http.prototype, {
    resolveAssetConfig: function (assetConfig, baseUrl, cb) {
        process.nextTick(function () {
            cb(null, [assetConfig]);
        });
    },

    getSrcProxy: function (assetConfig) {
        var that = this;
        return function (cb) {
            request({
                uri: that.root + assetConfig.url
            }, function (err, response, body) {
                console.log("GET "+ that.root + assetConfig.url + " => " + response.statusCode);

                if (response.statusCode >= 400) {
                    err = new Error("Got " + response.statusCode + " from remote server!");
                }
                cb(err, body);
            });
        };
    }
});
