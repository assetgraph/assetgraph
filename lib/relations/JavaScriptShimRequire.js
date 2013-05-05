/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    JavaScriptAmdRequire = require('./JavaScriptAmdRequire');

function JavaScriptShimRequire(config) {
    this._rawHref = config.href;
    JavaScriptAmdRequire.call(this, config);
}

util.inherits(JavaScriptShimRequire, JavaScriptAmdRequire);

extendWithGettersAndSetters(JavaScriptShimRequire.prototype, {
    get rawHref() {
        return this._rawHref;
    },

    // Doesn't really make sense
    set rawHref(rawHref) {
        this._rawHref = rawHref;
    },

    attach: function () {
        throw new Error("JavaScriptShimRequire.attach(): Not supported");
    },

    detach: function () {
        throw new Error("JavaScriptShimRequire.detach(): Not supported");
    }
});

module.exports = JavaScriptShimRequire;
