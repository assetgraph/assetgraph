const HtmlRelation = require('../HtmlRelation');

/** @typedef {import('../HtmlRelation')} HtmlRelation */
/** @typedef {import('../HtmlRelation').HtmlRelationConfig} HtmlRelationConfig */
/** @typedef {import('../Relation').RelationAttachmentPosition} RelationAttachmentPosition */

/**
 * @extends HtmlRelation
 */
class HtmlInlineEventHandler extends HtmlRelation {
  /**
   * @param {HTMLElement} node
   * @return {HtmlRelationConfig[]}
   */
  static getRelationsFromNode(node) {
    if (node.nodeType === node.ELEMENT_NODE) {
      const relations = [];
      for (const attribute of Array.from(node.attributes)) {
        if (/^on/i.test(attribute.nodeName)) {
          relations.push({
            type: 'HtmlInlineEventHandler',
            attributeName: attribute.nodeName,
            to: {
              type: 'JavaScript',
              isExternalizable: false,
              serializationOptions: {
                semicolons: true,
                side_effects: false,
                newline: '',
                indent_level: 0
              },
              text: `function bogus() {${attribute.nodeValue}}`
            },
            node
          });
        }
      }
      return relations;
    }
  }

  get href() {
    return this.node.getAttribute(this.attributeName);
  }

  set href(href) {
    this.node.setAttribute(this.attributeName, href);
  }

  inline() {
    const self = super.inline();
    this.href = this.to.text.replace(/^function[^{]*\{\s*|\s*};?\s*$/g, '');
    this.from.markDirty();
    return self;
  }

  attach() {
    throw new Error('HtmlInlineEventHandler.attach: Not supported.');
  }

  detach() {
    this.node.removeAttribute(this.attributeName);
    this.node = undefined;
    return super.detach();
  }
}

Object.assign(HtmlInlineEventHandler.prototype, {
  targetType: 'JavaScript',
  _hrefType: 'inline'
});

module.exports = HtmlInlineEventHandler;
