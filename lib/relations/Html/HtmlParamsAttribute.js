const HtmlDataBindAttribute = require('./HtmlDataBindAttribute');

class HtmlParamsAttribute extends HtmlDataBindAttribute {
  static getRelationsFromNode(node) {
    if (node.nodeType === node.ELEMENT_NODE && node.matches('[params]')) {
      const text = node.getAttribute('params');
      const parseTree = HtmlParamsAttribute._tryParseObjectLiteral(text);
      if (parseTree) {
        return {
          type: 'HtmlParamsAttribute',
          to: {
            type: 'JavaScript',
            isExternalizable: false,
            serializationOptions: {
              semicolons: true,
              side_effects: false,
              newline: '',
              indent_level: 0,
            },
            parseTree,
            text,
          },
          node,
        };
      }
    }
  }
}

Object.assign(HtmlParamsAttribute.prototype, {
  propertyName: 'params',
  targetType: 'JavaScript',
});

module.exports = HtmlParamsAttribute;
