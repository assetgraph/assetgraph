const HtmlRelation = require('../HtmlRelation');

/** @typedef {import('../HtmlRelation')} HtmlRelation */
/** @typedef {import('../HtmlRelation').HtmlRelationConfig} HtmlRelationConfig */
/** @typedef {import('../Relation').RelationAttachmentPosition} RelationAttachmentPosition */

/**
 * @extends HtmlRelation
 */
class HtmlStyleAttribute extends HtmlRelation {
  /**
   * @param {HTMLElement} node
   * @return {HtmlRelationConfig}
   */
  static getRelationsFromNode(node) {
    if (node.nodeType === node.ELEMENT_NODE && node.matches('[style]')) {
      return {
        type: 'HtmlStyleAttribute',
        to: {
          type: 'Css',
          isExternalizable: false,
          text: `bogusselector {${node.getAttribute('style')}}`
        },
        node
      };
    }
  }

  get href() {
    return this.node.getAttribute('style');
  }

  set href(href) {
    this.node.setAttribute('style', href);
  }

  inline() {
    super.inline();
    this.href = this.to.text.replace(/^bogusselector\s*\{\s*|\s*}\s*$/g, '');
    this.from.markDirty();
    return this;
  }

  attach() {
    throw new Error('HtmlStyleAttribute.attach: Not supported.');
  }

  detach() {
    this.node.removeAttribute('style');
    this.node = undefined;
    return super.detach();
  }
}

Object.assign(HtmlStyleAttribute.prototype, {
  targetType: 'Css',
  _hrefType: 'inline'
});

module.exports = HtmlStyleAttribute;
