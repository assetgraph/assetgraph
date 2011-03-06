/*global require, exports*/
var util = require('util'),
    Buffer = require('buffer').Buffer,
    _ = require('underscore'),
    error = require('../error'),
    Base = require('./Base').Base;

function CSSAlphaImageLoader(config) {
    Base.call(this, config);
}

util.inherits(CSSAlphaImageLoader, Base);

_.extend(CSSAlphaImageLoader.prototype, {
    baseAssetQuery: {type: 'HTML'},

    _setRawUrlString: function (url) {
        var style = this.cssRule.style;
        style[this.propertyName] = style[this.propertyName].replace(/\burl=(\'|\"|)([^\'\"]+)\1/, function () {
            return "url='" + url.replace(/([\'\"])/g, "\\$1") + "'";
        });
    },

    remove: function () {
        this.cssRule.style.filter = null; // There can be multiple filters, so this might be a little too brutal
        delete this.cssRule;
    }
});

exports.CSSAlphaImageLoader = CSSAlphaImageLoader;
