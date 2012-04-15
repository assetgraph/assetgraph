/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function CssUrlTokenRelation(config) {
    Relation.call(this, config);
    this.tokenNumber = this.tokenNumber || 0;
}

util.inherits(CssUrlTokenRelation, Relation);

extendWithGettersAndSetters(CssUrlTokenRelation.prototype, {
    tokenRegExp: /\burl\((\'|\"|)([^\'\"]+?)\1\)/g,

    createUrlToken: function (href) {
        // Quote if necessary:
        if (/^[a-z0-9\/\-_.]*$/i.test(href)) {
            return "url(" + href + ")";
        } else {
            return "url('" + href.replace(/([\'\"])/g, "\\$1") + "')";
        }
    },

    get href() {
        this.tokenRegExp.lastIndex = 0; // Just in case
        var tokenNumber = 0,
            matchToken,
            url;
        while ((matchToken = this.tokenRegExp.exec(this.cssRule.style.getPropertyValue(this.propertyName)))) {
            if (tokenNumber === this.tokenNumber) {
                url = matchToken[2];
            }
            tokenNumber += 1;
        }
        return url; // Undefined if not found
    },

    set href(href) {
        var cssUrlToken = this.createUrlToken(href),
            tokenNumber = 0;
        this.cssRule.style.setProperty(this.propertyName, this.cssRule.style.getPropertyValue(this.propertyName).replace(this.tokenRegExp, function ($0, quoteChar, url) {
            if (tokenNumber++ === this.tokenNumber) {
                return cssUrlToken;
            } else {
                return $0;
            }
        }.bind(this)));
    },

    inline: function () {
        Relation.prototype.inline.call(this);
        this.href = "data:" + this.to.contentType + ";base64," + this.to.rawSrc.toString('base64');
        this.from.markDirty();
        return this;
    },

    attach: function (asset, position, adjacentRelation) {
        throw new Error("Not implemented");
    },

    detach: function () {
        var value = this.cssRule.style.getPropertyValue(this.propertyName),
            matchToken = value && value.match(this.tokenRegExp);
        if (matchToken) {
            if (value === matchToken[0]) {
                this.cssRule.style.removeProperty(this.propertyName);
            } else {
                throw new Error("Not implemented");
            }
        }
        delete this.cssRule;
        return Relation.prototype.detach.call(this);
    }
});

module.exports = CssUrlTokenRelation;
