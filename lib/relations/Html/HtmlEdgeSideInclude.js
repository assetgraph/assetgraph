const HtmlRelation = require('../HtmlRelation');

/** @typedef {import('../HtmlRelation')} HtmlRelation */
/** @typedef {import('../HtmlRelation').HtmlRelationConfig} HtmlRelationConfig */
/** @typedef {import('../Relation').RelationAttachmentPosition} RelationAttachmentPosition */

/**
 * @extends HtmlRelation
 */
class HtmlEdgeSideInclude extends HtmlRelation {
  /**
   * @param {HTMLElement} node
   * @return {HtmlRelationConfig}
   */
  static getRelationsFromNode(node) {
    if (
      node.nodeType === node.ELEMENT_NODE &&
      node.matches('esi\\:include[src]')
    ) {
      return {
        type: 'HtmlEdgeSideInclude',
        href: node.getAttribute('src'),
        node
      };
    }
  }

  get href() {
    return this.node.getAttribute('src');
  }

  set href(href) {
    this.node.setAttribute('src', href);
  }

  inline() {
    throw new Error('HtmlEdgeSideInclude.inline(): Not implemented yet.');
  }

  /**
   * @param {RelationAttachmentPosition} position
   * @param {HTMLElement | HtmlRelation} adjacentRelation
   */
  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('esi:include');
    return super.attach(position, adjacentRelation);
  }
}

module.exports = HtmlEdgeSideInclude;
