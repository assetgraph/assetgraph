var util = require('util'),
    CssUrlTokenRelation = require('./CssUrlTokenRelation');

function CssImage(config) {
    CssUrlTokenRelation.call(this, config);
}

util.inherits(CssImage, CssUrlTokenRelation);

module.exports = CssImage;
