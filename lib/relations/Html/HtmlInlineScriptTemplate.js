const HtmlRelation = require('../HtmlRelation');

/** @typedef {import('../HtmlRelation')} HtmlRelation */
/** @typedef {import('../HtmlRelation').HtmlRelationConfig} HtmlRelationConfig */
/** @typedef {import('../Relation').RelationAttachmentPosition} RelationAttachmentPosition */

/**
 * @extends HtmlRelation
 */
class HtmlInlineScriptTemplate extends HtmlRelation {
  /**
   * @param {HTMLElement} node
   * @return {HtmlRelationConfig}
   */
  static getRelationsFromNode(node) {
    if (
      node.nodeType === node.ELEMENT_NODE &&
      node.matches('script[type="text/html"], script[type="text/ng-template]')
    ) {
      return {
        type: 'HtmlInlineScriptTemplate',
        to: {
          type: 'Html',
          isExternalizable: false,
          text: node.innerHTML || ''
        },
        node
      };
    }
  }

  inline() {
    const self = super.inline();
    this.node.textContent = this.to.text;
    this.from.markDirty();
    return self;
  }

  /**
   * @param {RelationAttachmentPosition} position
   * @param {HTMLElement | HtmlRelation} adjacentRelation
   */
  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('script');
    this.node.setAttribute('type', this.to.contentType);

    return super.attach(position, adjacentRelation);
  }
}

HtmlInlineScriptTemplate.prototype._hrefType = 'inline';

module.exports = HtmlInlineScriptTemplate;
