var HtmlDataBindAttribute = require('./HtmlDataBindAttribute');
var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters');

function HtmlParamsAttribute(config) {
    HtmlDataBindAttribute.call(this, config);
}

util.inherits(HtmlParamsAttribute, HtmlDataBindAttribute);

extendWithGettersAndSetters(HtmlParamsAttribute.prototype, {
    propertyName: 'params'
});

module.exports = HtmlParamsAttribute;
