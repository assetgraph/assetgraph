/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    query = require('../query'),
    Relation = require('./Relation');

function CssBehavior(config) {
    Relation.call(this, config);
}

util.inherits(CssBehavior, Relation);

extendWithGettersAndSetters(CssBehavior.prototype, {
    baseAssetQuery: {type: 'Html', isInline: false},

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
        this.cssRule.style[this.propertyName] = cssUrlToken;
    },

    inline: function () {
        Relation.prototype.inline.call(this);
        this.href = "data:" + this.to.contentType + ";base64," + this.to.rawSrc.toString('base64');
        this.from.markDirty();
    },

    attach: function (asset, position, adjacentRelation) {
        throw new Error("Not implemented");
    },

    detach: function () {
        this.cssRule.style.removeProperty(this.propertyName);
        delete this.cssRule;
        Relation.prototype.detach.apply(this, arguments);
    }
});

module.exports = CssBehavior;
