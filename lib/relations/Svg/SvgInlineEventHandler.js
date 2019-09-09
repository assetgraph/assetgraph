const SvgRelation = require('./SvgRelation');

class SvgInlineEventHandler extends SvgRelation {
  static get selector() {
    return '*';
  }

  static handler(node) {
    const outgoingRelations = [];
    for (const attribute of Array.from(node.attributes)) {
      if (/^on/i.test(attribute.nodeName)) {
        outgoingRelations.push({
          type: 'SvgInlineEventHandler',
          attributeName: attribute.nodeName,
          to: {
            type: 'JavaScript',
            isExternalizable: false,
            text: `function bogus() {${attribute.nodeValue}}`
          },
          node
        });
      }
    }
    return outgoingRelations;
  }

  inline() {
    super.inline();
    this.node.setAttribute(
      this.attributeName,
      this.to.text.replace(/^function[^{]*\{|};?\s*$/g, '')
    );
    this.from.markDirty();
    return this;
  }

  attach() {
    throw new Error('SvgInlineEventHandler.attach: Not supported.');
  }

  detach() {
    this.node.removeAttribute(this.attributeName);
    this.node = undefined;
    return super.detach();
  }
}

Object.assign(SvgInlineEventHandler.prototype, {
  targetType: 'JavaScript',
  _hrefType: 'inline'
});

module.exports = SvgInlineEventHandler;
