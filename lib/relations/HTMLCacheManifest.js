/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    error = require('../error'),
    Base = require('./Base').Base;

function HTMLCacheManifest(config) {
    Base.call(this, config);
}

util.inherits(HTMLCacheManifest, Base);

_.extend(HTMLCacheManifest.prototype, {
    _setRawUrlString: function (url) {
            this.node.setAttribute('manifest', url);
    },

    remove: function () {
        this.node.removeAttribute('manifest');
    },

    createNode: function (document) {
        return document.documentElement; // Always uses <html manifest='...'>
    }
});

exports.HTMLCacheManifest = HTMLCacheManifest;
