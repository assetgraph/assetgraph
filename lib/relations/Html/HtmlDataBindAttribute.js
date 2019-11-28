const HtmlRelation = require('../HtmlRelation');
const parseJavaScript = require('../../parseJavaScript');

// Knockout.js data-bind
class HtmlDataBindAttribute extends HtmlRelation {
  static _tryParseObjectLiteral(text) {
    // See if the attribute value can be parsed as a Knockout.js data-bind/params:
    const javaScriptObjectLiteral = `({${text.replace(
      /^\s*\{(.*)\}\s*$/,
      '$1'
    )}});`;
    try {
      return parseJavaScript(javaScriptObjectLiteral, {
        sourceType: 'module'
      });
    } catch (e) {}
  }

  static getRelationsFromNode(node) {
    if (node.nodeType === node.ELEMENT_NODE && node.matches('[data-bind]')) {
      const text = node.getAttribute('data-bind');
      const parseTree = HtmlDataBindAttribute._tryParseObjectLiteral(text);
      if (parseTree) {
        return {
          type: 'HtmlDataBindAttribute',
          to: {
            type: 'JavaScript',
            isExternalizable: false,
            serializationOptions: {
              semicolons: true,
              side_effects: false,
              newline: '',
              indent_level: 0
            },
            parseTree,
            text
          },
          node
        };
      }
    }
  }

  inlineHtmlRelation() {
    this.node.setAttribute(
      this.propertyName,
      this.to.text.replace(/^\(\{\s*|\s*\}\);?$/g, '')
    );
    this.from.markDirty();
  }

  attach() {
    throw new Error('HtmlDataBindAttribute.attach: Not supported.');
  }

  detach() {
    this.node.removeAttribute(this.propertyName);
    this.node = undefined;
    return super.detach();
  }
}

Object.assign(HtmlDataBindAttribute.prototype, {
  propertyName: 'data-bind',
  targetType: 'JavaScript',
  _hrefType: 'inline'
});

module.exports = HtmlDataBindAttribute;
