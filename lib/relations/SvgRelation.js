var util = require('util'),
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
