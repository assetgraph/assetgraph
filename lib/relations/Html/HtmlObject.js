const HtmlRelation = require('../HtmlRelation');

/** @typedef {import('../HtmlRelation')} HtmlRelation */
/** @typedef {import('../HtmlRelation').HtmlRelationConfig} HtmlRelationConfig */
/** @typedef {import('../Relation').RelationAttachmentPosition} RelationAttachmentPosition */

// Requires: config.attributeName
/**
 * @extends HtmlRelation
 */
class HtmlObject extends HtmlRelation {
  // Should probably be split into two or three relation classes:
  /**
   * @param {HTMLElement} node
   * @return {HtmlRelationConfig}
   */
  static getRelationsFromNode(node) {
    if (
      node.nodeType === node.ELEMENT_NODE &&
      node.matches(
        'object[data], object > param[name=src i][value], object > param[name=movie i][value]'
      )
    ) {
      if (node.nodeName.toLowerCase() === 'param') {
        return {
          type: 'HtmlObject',
          href: node.getAttribute('value'),
          node,
          attributeName: 'value'
        };
      } else {
        // node.nodeName.toLowerCase() === 'object'
        return {
          type: 'HtmlObject',
          href: node.getAttribute('data'),
          node,
          attributeName: 'data'
        };
      }
    }
  }

  get href() {
    return this.node.getAttribute(this.attributeName);
  }

  set href(href) {
    this.node.setAttribute(this.attributeName, href);
  }

  /**
   * @param {RelationAttachmentPosition} position
   * @param {HTMLElement | HtmlRelation} adjacentRelation
   */
  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('object');
    return super.attach(position, adjacentRelation);
  }
}

module.exports = HtmlObject;
