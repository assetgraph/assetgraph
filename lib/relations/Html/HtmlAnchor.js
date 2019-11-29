const HtmlRelation = require('../HtmlRelation');

/** @typedef {import('../HtmlRelation').HtmlRelationConfig} HtmlRelationConfig */
/** @typedef {import('../Relation').RelationAttachmentPosition} RelationAttachmentPosition */

class HtmlAnchor extends HtmlRelation {
  /**
   * @param {HTMLElement} node
   * @return {HtmlRelationConfig}
   */
  static getRelationsFromNode(node) {
    if (node.nodeType === node.ELEMENT_NODE && node.matches('a[href]')) {
      return {
        type: 'HtmlAnchor',
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
    this.node = this.from.parseTree.createElement('a');
    return super.attach(position, adjacentRelation);
  }
}

module.exports = HtmlAnchor;
