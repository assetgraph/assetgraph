/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function CssImage(config) {
    Relation.call(this, config);
}

util.inherits(CssImage, Relation);

extendWithGettersAndSetters(CssImage.prototype, {
    get href() {
        var matchUrl = this.cssRule.style[this.propertyName].match(/\burl\((\'|\"|)([^\'\"]+?)\1\)|$/);
        if (matchUrl) {
            return matchUrl[2];
        }
        // Else return undefined
    },

    set href(href) {
        var cssUrlToken;
        // Quote if necessary:
        if (/^[a-z0-9\/\-_.]*$/i.test(href)) {
            cssUrlToken = "url(" + href + ")";
        } else {
            cssUrlToken = "url('" + href.replace(/([\'\"])/g, "\\$1") + "')";
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

    attach: function (asset, position, adjacentRelation) {
        throw new Error("Not implemented");
    },

    detach: function () {
        var style = this.cssRule.style;
        if (this.propertyName === 'background-image' || style[this.propertyName].match(/^url\((\'|\"|)([^\'\"]*?)\1\)$/)) {
            style.removeProperty(this.propertyName);
        } else {
            // We're attached to a 'background' property with other tokens in it. Just remove the url().
            style[this.propertyName] = style[this.propertyName].replace(/\burl\((\'|\"|)([^\'\"]*?)\1\)\s?/, "");
        }
        delete this.propertyName;
        delete this.cssRule;
        Relation.prototype.detach.apply(this, arguments);
    },

    _inline: function () {
        this.href = "data:" + this.to.contentType + ";base64," + this.to.rawSrc.toString('base64');
    }
});

module.exports = CssImage;
