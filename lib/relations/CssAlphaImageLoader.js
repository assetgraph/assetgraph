/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    query = require('../query'),
    Base = require('./Base');

function CssAlphaImageLoader(config) {
    Base.call(this, config);
}

util.inherits(CssAlphaImageLoader, Base);

extendWithGettersAndSetters(CssAlphaImageLoader.prototype, {
    baseAssetQuery: {type: 'Html', isInline: false},

    get href() {
        var matchUrl = this.cssRule.style[this.propertyName].match(/\bsrc=(\'|\"|)([^\'\"]*?)\1/);
        if (matchUrl) {
            return matchUrl[2];
        }
        // Else return undefined
    },

    set href(href) {
        var style = this.cssRule.style;
        style[this.propertyName] = style[this.propertyName].replace(/\bsrc=(\'|\"|)(?:[^\'\"]*?)\1/, function () {
           return "src='" + href.replace(/([\'\"])/g, "\\$1") + "'";
        });
    },

    attach: function (asset, position, adjacentRelation) {
        throw new Error("Not implemented");
    },

    detach: function () {
        this.cssRule.style.filter = null; // There can be multiple filters, so this might be a little too brutal
        delete this.cssRule;
        Base.prototype.detach.apply(this, arguments);
    }
});

module.exports = CssAlphaImageLoader;
