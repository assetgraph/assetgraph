const HtmlRelation = require('../HtmlRelation');

/** @typedef {import('../HtmlRelation')} HtmlRelation */
/** @typedef {import('../HtmlRelation').HtmlRelationConfig} HtmlRelationConfig */
/** @typedef {import('../Relation').RelationAttachmentPosition} RelationAttachmentPosition */

/**
 * @extends {HtmlRelation}
 *
 * Implementation of https://www.w3.org/TR/resource-hints/#prerender
 */
/**
 * @extends HtmlRelation
 */
class HtmlPrerenderLink extends HtmlRelation {
  /**
   * @param {HTMLElement} node
   * @return {HtmlRelationConfig}
   */
  static getRelationsFromNode(node) {
    if (
      node.nodeType === node.ELEMENT_NODE &&
      node.matches('link[href][rel~=prerender]')
    ) {
      return {
        type: 'HtmlPrerenderLink',
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
    this.node.setAttribute('rel', 'prerender');
    return super.attach(position, adjacentRelation);
  }

  inline() {
    throw new Error(
      'HtmlPrerenderLink: Inlining of resource hints is not allowed'
    );
  }
}

module.exports = HtmlPrerenderLink;
