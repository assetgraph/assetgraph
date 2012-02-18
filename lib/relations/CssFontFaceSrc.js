/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function CssFontFaceSrc(config) {
    Relation.call(this, config);
}

util.inherits(CssFontFaceSrc, Relation);

extendWithGettersAndSetters(CssFontFaceSrc.prototype, {
    get href() {
        var matchUrl = this.cssRule.style.src.match(/\burl\((\'|\"|)([^\'\"]+?)\1\)|$/);
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
        this.cssRule.style.setProperty('src', cssUrlToken);
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
        this.cssRule.style.removeProperty('src');
        delete this.cssRule;
        return Relation.prototype.detach.call(this);
    }
});

module.exports = CssFontFaceSrc;
