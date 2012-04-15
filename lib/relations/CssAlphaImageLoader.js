/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    CssUrlTokenRelation = require('./CssUrlTokenRelation');

function CssAlphaImageLoader(config) {
    CssUrlTokenRelation.call(this, config);
}

util.inherits(CssAlphaImageLoader, CssUrlTokenRelation);

extendWithGettersAndSetters(CssAlphaImageLoader.prototype, {
    baseAssetQuery: {type: 'Html', isInline: false},

    tokenRegExp: /\bsrc=(\'|\"|)([^\'\"]*?)\1/g,

    createUrlToken: function (href) {
        // Quote if necessary:
        return "src='" + href.replace(/([\'\"])/g, "\\$1") + "'";
    },

    detach: function () {
        this.cssRule.style.removeProperty('filter'); // There can be multiple filters, so this might be a little too brutal
        delete this.cssRule;
        return CssUrlTokenRelation.prototype.detach.call(this);
    }
});

module.exports = CssAlphaImageLoader;
