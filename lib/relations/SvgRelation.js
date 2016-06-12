var util = require('util'),
    HtmlRelation = require('./HtmlRelation');

function SvgRelation(config) {
    HtmlRelation.call(this, config);
}

util.inherits(SvgRelation, HtmlRelation);

module.exports = SvgRelation;
