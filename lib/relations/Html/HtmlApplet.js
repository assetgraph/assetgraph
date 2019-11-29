const HtmlRelation = require('../HtmlRelation');

/** @typedef {import('../HtmlRelation').HtmlRelationConfig} HtmlRelationConfig */
/** @typedef {import('../Relation').RelationAttachmentPosition} RelationAttachmentPosition */

// Requires: config.attributeName
class HtmlApplet extends HtmlRelation {
  /**
   * @param {HTMLElement} node
   * @return {HtmlRelationConfig[]}
   */
  static getRelationsFromNode(node) {
    if (node.nodeType === node.ELEMENT_NODE && node.matches('applet')) {
      /** @type {HtmlRelationConfig[]} */
      const relations = [];

      for (const attributeName of ['archive', 'codebase']) {
        // Note: Only supports one url in the archive attribute. The Html 4.01 spec says it can be a comma-separated list.
        if (node.hasAttribute(attributeName)) {
          relations.push({
            type: 'HtmlApplet',
            href: node.getAttribute(attributeName),
            node,
            attributeName
          });
        }
      }
      return relations;
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
   * @param {HtmlRelation} adjacentRelation
   */
  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('applet');
    return super.attach(position, adjacentRelation);
  }
}

module.exports = HtmlApplet;
