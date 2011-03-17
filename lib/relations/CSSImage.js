/*global require, exports*/
var util = require('util'),
    Buffer = require('buffer').Buffer,
    _ = require('underscore'),
    error = require('../error'),
    Base = require('./Base').Base;

function CSSImage(config) {
    Base.call(this, config);
}

util.inherits(CSSImage, Base);

_.extend(CSSImage.prototype, {
    remove: function () {
        var style = this.cssRule.style;
        if (this.propertyName === 'background-image' || style[this.propertyName].match(/^url\((\'|\"|)([^\'\"]*)\1\)$/)) {
            style.removeProperty(this.propertyName);
        } else {
            // We're attached to a 'background' property with other tokens in it. Just remove the url().
            style.setProperty(this.propertyName, style[this.propertyName].replace(/\burl\((\'|\"|)([^\'\"]*)\1\)\s?/, ""));
        }
        delete this.propertyName;
        delete this.cssRule;
    },

    _setRawUrlString: function (url) {
        var cssUrlToken;
        // Quote if necessary:
        if (/^[a-z0-9\/\-_.]*$/i.test(url)) {
            cssUrlToken = "url(" + url + ")";
        } else {
            cssUrlToken = "url('" + url.replace(/([\'\"])/g, "\\$1") + "')";
        }
        if (this.propertyName in this.cssRule.style) {
            var existingValue = this.cssRule.style[this.propertyName];
            this.cssRule.style.setProperty(this.propertyName, existingValue.replace(/\burl\((\'|\"|)[^\'\"]+\1\)|$/, function ($0) {
                if ($0.length) {
                    return cssUrlToken;
                } else {
                    // Must have matched $, assume there's no url(...) token in the property value, add cssUrlToken at the end:
                    return (existingValue.length > 0 ? " " : "") + cssUrlToken;
                }
            }));
        } else {
            this.cssRule.style.setProperty(this.propertyName, cssUrlToken);
        }
    },

    _inline: function (src) {
        that._setRawUrlString("data:" + that.to.contentType + ";base64," + new Buffer(src, 'binary').toString('base64'));
    }
});

exports.CSSImage = CSSImage;
