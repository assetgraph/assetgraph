const CssUrlTokenRelation = require('./CssUrlTokenRelation');

class CssFontFaceSrc extends CssUrlTokenRelation {};

Object.assign(CssFontFaceSrc.prototype, {
    propertyName: 'src'
});

module.exports = CssFontFaceSrc;
