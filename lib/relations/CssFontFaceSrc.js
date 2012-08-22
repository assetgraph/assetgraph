/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    CssUrlTokenRelation = require('./CssUrlTokenRelation');

function CssFontFaceSrc(config) {
    CssUrlTokenRelation.call(this, config);
}

util.inherits(CssFontFaceSrc, CssUrlTokenRelation);

extendWithGettersAndSetters(CssFontFaceSrc.prototype, {
    propertyName: 'src'
});

module.exports = CssFontFaceSrc;
