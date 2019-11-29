const HtmlRelation = require('../HtmlRelation');

/** @typedef {import('../HtmlRelation')} HtmlRelation */
/** @typedef {import('../HtmlRelation').HtmlRelationConfig} HtmlRelationConfig */
/** @typedef {import('../Relation').RelationAttachmentPosition} RelationAttachmentPosition */

/**
 * @extends HtmlRelation
 */
class HtmlImport extends HtmlRelation {
  /**
   * @param {HTMLElement} node
   * @return {HtmlRelationConfig}
   */
  static getRelationsFromNode(node) {
    if (
      node.nodeType === node.ELEMENT_NODE &&
      node.matches('link[rel~=import][href]')
    ) {
      // HtmlImport specification: http://w3c.github.io/webcomponents/spec/imports/
      return {
        type: 'HtmlImport',
        to: {
          url: node.getAttribute('href'),
          type: 'Html',
          // Web Compoonents are explicitly not to be treated as HTML fragments
          // Override automated isFragment resolving here
          isFragment: false
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
   */
  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('link');
    this.node.setAttribute('rel', 'import');
    return super.attach(position, adjacentRelation);
  }
}

HtmlImport.prototype.targetType = 'Html';

module.exports = HtmlImport;
