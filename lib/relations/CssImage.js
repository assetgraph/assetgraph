/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    passError = require('../util/passError'),
    Base = require('./Base');

function CssImage(config) {
    Base.call(this, config);
}

util.inherits(CssImage, Base);

_.extend(CssImage.prototype, {
    _getRawUrlString: function () {
        var matchUrl = this.cssRule.style[this.propertyName].match(/\burl\((\'|\"|)([^\'\"]+?)\1\)|$/);
        if (matchUrl) {
            return matchUrl[2];
        }
        // Else return undefined
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
            this.cssRule.style[this.propertyName] = existingValue.replace(/\burl\((\'|\"|)[^\'\"]+?\1\)|$/, function ($0) {
                if ($0.length) {
                    return cssUrlToken;
                } else {
                    // Must have matched $, assume there's no url(...) token in the property value, add cssUrlToken at the end:
                    return (existingValue.length > 0 ? " " : "") + cssUrlToken;
                }
            });
        } else {
            this.cssRule.style[this.propertyName] = cssUrlToken;
        }
    },

    remove: function () {
        var style = this.cssRule.style;
        if (this.propertyName === 'background-image' || style[this.propertyName].match(/^url\((\'|\"|)([^\'\"]*?)\1\)$/)) {
            style.removeProperty(this.propertyName);
        } else {
            // We're attached to a 'background' property with other tokens in it. Just remove the url().
            style[this.propertyName] = style[this.propertyName].replace(/\burl\((\'|\"|)([^\'\"]*?)\1\)\s?/, "");
        }
        delete this.propertyName;
        delete this.cssRule;
    },

    _inline: function (cb) {
        var that = this;
        that.to.getRawSrc(passError(cb, function (rawSrc) {
            that._setRawUrlString("data:" + that.to.contentType + ";base64," + rawSrc.toString('base64'));
            cb();
        }));
    }
});

module.exports = CssImage;
