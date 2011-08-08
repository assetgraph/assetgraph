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

    set href(url) {
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
