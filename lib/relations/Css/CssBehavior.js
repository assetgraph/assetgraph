const CssUrlTokenRelation = require('./CssUrlTokenRelation');

class CssBehavior extends CssUrlTokenRelation {}

CssBehavior.prototype.targetType = 'Htc';

module.exports = CssBehavior;
