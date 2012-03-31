/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    CssUrlTokenRelation = require('./CssUrlTokenRelation');

function CssImage(config) {
    CssUrlTokenRelation.call(this, config);
}

util.inherits(CssImage, CssUrlTokenRelation);

module.exports = CssImage;
