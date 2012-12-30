/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    CssUrlTokenRelation = require('./CssUrlTokenRelation');

function CssBehavior(config) {
    CssUrlTokenRelation.call(this, config);
}

util.inherits(CssBehavior, CssUrlTokenRelation);

extendWithGettersAndSetters(CssBehavior.prototype, {
    baseAssetQuery: {type: 'Html', isInline: false, isFragment: false}
});

module.exports = CssBehavior;
