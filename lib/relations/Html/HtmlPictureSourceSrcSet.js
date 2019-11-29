const HtmlRelation = require('../HtmlRelation');

/** @typedef {import('../HtmlRelation')} HtmlRelation */
/** @typedef {import('../HtmlRelation').HtmlRelationConfig} HtmlRelationConfig */
/** @typedef {import('../Relation').RelationAttachmentPosition} RelationAttachmentPosition */

/**
 * @extends HtmlRelation
 */
class HtmlPictureSourceSrcSet extends HtmlRelation {
  /**
   * @param {HTMLElement} node
   * @return {HtmlRelationConfig}
   */
  static getRelationsFromNode(node) {
    if (
      node.nodeType === node.ELEMENT_NODE &&
      node.matches('picture > source[srcset]')
    ) {
      return {
        type: 'HtmlPictureSourceSrcSet',
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
    this.node.setAttribute('srcset', this.to.text);
    this.from.markDirty();
    return self;
  }

  /**
   * @param {RelationAttachmentPosition} position
   * @param {HTMLElement | HtmlRelation} adjacentRelation
   */
  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('source');
    return super.attach(position, adjacentRelation);
  }
}

HtmlPictureSourceSrcSet.prototype._hrefType = 'inline';

module.exports = HtmlPictureSourceSrcSet;
