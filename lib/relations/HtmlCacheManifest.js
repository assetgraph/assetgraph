/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Base = require('./Base');

function HtmlCacheManifest(config) {
    Base.call(this, config);
}

util.inherits(HtmlCacheManifest, Base);

extendWithGettersAndSetters(HtmlCacheManifest.prototype, {
    get href() {
        return this.node.getAttribute('manifest') || undefined;
    },

    set href(href) {
        this.node.setAttribute('manifest', href);
    },

    remove: function () {
        this.node.removeAttribute('manifest');
    },

    createNode: function (document) {
        return document.documentElement; // Always uses <html manifest='...'>
    }
});

module.exports = HtmlCacheManifest;
