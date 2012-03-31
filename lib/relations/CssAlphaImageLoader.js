/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function CssAlphaImageLoader(config) {
    Relation.call(this, config);
}

util.inherits(CssAlphaImageLoader, Relation);

extendWithGettersAndSetters(CssAlphaImageLoader.prototype, {
    baseAssetQuery: {type: 'Html', isInline: false},

    tokenRegExp: /\bsrc=(\'|\"|)([^\'\"]*?)\1/g,

    detach: function () {
        this.cssRule.style.removeProperty('filter'); // There can be multiple filters, so this might be a little too brutal
        delete this.cssRule;
        return Relation.prototype.detach.call(this);
    }
});

module.exports = CssAlphaImageLoader;
