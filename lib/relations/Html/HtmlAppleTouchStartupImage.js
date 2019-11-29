const HtmlRelation = require('../HtmlRelation');

/** @typedef {import('../HtmlRelation').HtmlRelationConfig} HtmlRelationConfig */
/** @typedef {import('../Relation').RelationAttachmentPosition} RelationAttachmentPosition */

class HtmlAppleTouchStartupImage extends HtmlRelation {
  /**
   * @param {HTMLElement} node
   * @return {HtmlRelationConfig}
   */
  static getRelationsFromNode(node) {
    if (
      node.nodeType === node.ELEMENT_NODE &&
      node.matches('link[href][rel~=apple-touch-startup-image]')
    ) {
      return {
        type: 'HtmlAppleTouchStartupImage',
        href: node.getAttribute('href'),
        node
      };
    }
  }

  get href() {
    return this.node.getAttribute('href');
  }

  set href(href) {
    this.node.setAttribute('href', href);
  }

  /**
   * @param {RelationAttachmentPosition} position
   * @param {HTMLElement | HtmlRelation} adjacentRelation
   */
  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('link');
    this.node.setAttribute('rel', 'apple-touch-startup-image');
    return super.attach(position, adjacentRelation);
  }
}

HtmlAppleTouchStartupImage.prototype.targetType = 'Image';

module.exports = HtmlAppleTouchStartupImage;
