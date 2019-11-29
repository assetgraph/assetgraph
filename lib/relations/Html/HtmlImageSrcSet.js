const HtmlRelation = require('../HtmlRelation');

/** @typedef {import('../HtmlRelation')} HtmlRelation */
/** @typedef {import('../HtmlRelation').HtmlRelationConfig} HtmlRelationConfig */
/** @typedef {import('../Relation').RelationAttachmentPosition} RelationAttachmentPosition */

/**
 * @extends HtmlRelation
 */
class HtmlImageSrcSet extends HtmlRelation {
  /**
   * @param {HTMLElement} node
   * @return {HtmlRelationConfig}
   */
  static getRelationsFromNode(node) {
    if (node.nodeType === node.ELEMENT_NODE && node.matches('img[srcset]')) {
      return {
        type: 'HtmlImageSrcSet',
        to: {
          type: 'SrcSet',
          text: node.getAttribute('srcset')
        },
        node
      };
    }
  }

  inline() {
    const self = super.inline();
    this.node.setAttribute(this.attributeName, this.to.text);
    this.from.markDirty();
    return self;
  }

  /**
   * @param {RelationAttachmentPosition} position
   * @param {HTMLElement | HtmlRelation} adjacentRelation
   */
  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('img');
    return super.attach(position, adjacentRelation);
  }
}

Object.assign(HtmlImageSrcSet.prototype, {
  targetType: 'SrcSet',
  _hrefType: 'inline',
  attributeName: 'srcset'
});

module.exports = HtmlImageSrcSet;
