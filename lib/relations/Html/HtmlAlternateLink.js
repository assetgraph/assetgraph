const HtmlRelation = require('../HtmlRelation');

/** @typedef {import('../Relation')} Relation */
/** @typedef {import('../Relation').RelationAttachmentPosition} RelationAttachmentPosition */

class HtmlAlternateLink extends HtmlRelation {
  /**
   * @param {HTMLElement} node
   * @return {import('../HtmlRelation').HtmlRelationConfig}
   */
  static getRelationsFromNode(node) {
    if (
      node.nodeType === node.ELEMENT_NODE &&
      node.matches('link[href][rel~=alternate]')
    ) {
      return {
        type: 'HtmlAlternateLink',
        to: {
          url: node.getAttribute('href'),
          contentType: node.getAttribute('type') || undefined
        },
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
   * @return {this}
   */
  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('link');
    this.node.setAttribute('rel', 'alternate');
    this.node.setAttribute('type', this.to.contentType);
    return super.attach(position, adjacentRelation);
  }
}

module.exports = HtmlAlternateLink;
