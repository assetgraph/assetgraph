/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    HtmlRelation = require('./HtmlRelation');

function SvgRelation(config) {
    HtmlRelation.call(this, config);
}

util.inherits(SvgRelation, HtmlRelation);

extendWithGettersAndSetters(SvgRelation.prototype, {
    baseAssetQuery: {isInline: false} // Override HtmlRelation.prototype.baseAssetQuery
});

module.exports = SvgRelation;
