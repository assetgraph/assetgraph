const CssUrlTokenRelation = require('./CssUrlTokenRelation');

class CssFontFaceSrc extends CssUrlTokenRelation {}

Object.assign(CssFontFaceSrc.prototype, {
  targetType: 'Font'
});

module.exports = CssFontFaceSrc;
