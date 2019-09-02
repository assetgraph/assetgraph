const HtmlDataBindAttribute = require('./HtmlDataBindAttribute');

class HtmlParamsAttribute extends HtmlDataBindAttribute {}

Object.assign(HtmlParamsAttribute.prototype, {
  propertyName: 'params'
});

HtmlDataBindAttribute.prototype.targetType = 'JavaScript';

module.exports = HtmlParamsAttribute;
