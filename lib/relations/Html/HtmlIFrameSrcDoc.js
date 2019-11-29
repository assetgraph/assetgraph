const HtmlRelation = require('../HtmlRelation');

/** @typedef {import('../HtmlRelation')} HtmlRelation */
/** @typedef {import('../HtmlRelation').HtmlRelationConfig} HtmlRelationConfig */
/** @typedef {import('../Relation').RelationAttachmentPosition} RelationAttachmentPosition */

/**
 * @extends HtmlRelation
 */
class HtmlIFrameSrcDoc extends HtmlRelation {
  /**
   * @param {HTMLElement} node
   * @return {HtmlRelationConfig}
   */
  static getRelationsFromNode(node) {
    if (node.nodeType === node.ELEMENT_NODE && node.matches('iframe[srcdoc]')) {
      return {
        type: 'HtmlIFrameSrcDoc',
        to: {
          type: 'Html',
          text: node.getAttribute('srcdoc')
        },
        node
      };
    }
  }

  inline() {
    const self = super.inline();
    this.node.setAttribute('srcdoc', this.to.text);
    this.from.markDirty();
    return self;
  }

  /**
   * @param {RelationAttachmentPosition} position
   * @param {HTMLElement | HtmlRelation} adjacentRelation
   */
  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('iframe');
    return super.attach(position, adjacentRelation);
  }
}

HtmlIFrameSrcDoc.prototype._hrefType = 'inline';

module.exports = HtmlIFrameSrcDoc;
