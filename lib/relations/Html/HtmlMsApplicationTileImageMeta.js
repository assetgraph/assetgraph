const HtmlRelation = require('../HtmlRelation');

/** @typedef {import('../HtmlRelation')} HtmlRelation */
/** @typedef {import('../HtmlRelation').HtmlRelationConfig} HtmlRelationConfig */
/** @typedef {import('../Relation').RelationAttachmentPosition} RelationAttachmentPosition */

/**
 * @extends HtmlRelation
 */
class HtmlMsApplicationTileImageMeta extends HtmlRelation {
  /**
   * @param {HTMLElement} node
   * @return {HtmlRelationConfig}
   */
  static getRelationsFromNode(node) {
    if (
      node.nodeType === node.ELEMENT_NODE &&
      node.matches('meta[name=msapplication-TileImage][content]')
    ) {
      return {
        type: 'HtmlMsApplicationTileImageMeta',
        href: node.getAttribute('content'),
        node
      };
    }
  }

  get href() {
    return this.node.getAttribute('content');
  }

  set href(href) {
    this.node.setAttribute('content', href);
  }

  /**
   * @param {RelationAttachmentPosition} position
   * @param {HTMLElement | HtmlRelation} adjacentRelation
   */
  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('meta');
    this.node.setAttribute('name', 'msapplication-TileImage');
    return super.attach(position, adjacentRelation);
  }
}

HtmlMsApplicationTileImageMeta.prototype.targetType = 'Image';

module.exports = HtmlMsApplicationTileImageMeta;
