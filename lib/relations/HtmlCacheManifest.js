/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    passError = require('../util/passError'),
    Base = require('./Base');

function HtmlCacheManifest(config) {
    Base.call(this, config);
}

util.inherits(HtmlCacheManifest, Base);

_.extend(HtmlCacheManifest.prototype, {
    _getRawUrlString: function () {
        return this.node.getAttribute('manifest') || undefined;
    },

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

module.exports = HtmlCacheManifest;
