const CssUrlTokenRelation = require('./CssUrlTokenRelation');

class CssImage extends CssUrlTokenRelation {}

CssImage.prototype.targetType = 'Image';

module.exports = CssImage;
