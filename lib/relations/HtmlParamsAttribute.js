const HtmlDataBindAttribute = require('./HtmlDataBindAttribute');

class HtmlParamsAttribute extends HtmlDataBindAttribute {};

Object.assign(HtmlParamsAttribute.prototype, {
    propertyName: 'params'
});

module.exports = HtmlParamsAttribute;
