const CssUrlTokenRelation = require('./CssUrlTokenRelation');

class CssFontFaceSrc extends CssUrlTokenRelation {};

Object.assign(CssFontFaceSrc.prototype, {
    propertyName: 'src',

    targetType: 'Font'
});

module.exports = CssFontFaceSrc;
