var util = require('util'),
    CssUrlTokenRelation = require('./CssUrlTokenRelation');

function CssBehavior(config) {
    CssUrlTokenRelation.call(this, config);
}

util.inherits(CssBehavior, CssUrlTokenRelation);

module.exports = CssBehavior;
