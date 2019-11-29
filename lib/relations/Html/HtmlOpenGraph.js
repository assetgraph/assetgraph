const HtmlRelation = require('../HtmlRelation');

/** @typedef {import('../HtmlRelation')} HtmlRelation */
/** @typedef {import('../HtmlRelation').HtmlRelationConfig} HtmlRelationConfig */
/** @typedef {import('../Relation').RelationAttachmentPosition} RelationAttachmentPosition */

/**
 * @extends HtmlRelation
 */
class HtmlOpenGraph extends HtmlRelation {
  /**
   * @param {HTMLElement} node
   * @return {HtmlRelationConfig}
   */
  static getRelationsFromNode(node) {
    // Can be made a bit nicer when nwmatcher supports :is from https://www.w3.org/TR/selectors-4/ (still draft)
    if (
      node.nodeType === node.ELEMENT_NODE &&
      node.matches(
        'meta[content][property^="og:"][property$=url], meta[content][property="og:image"], meta[content][property="og:audio"], meta[content][property="og:video"]'
      )
    ) {
      return {
        type: 'HtmlOpenGraph',
        href: node.getAttribute('content'),
        node,
        ogProperty: node.getAttribute('property')
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
    this.node.setAttribute('property', this.ogProperty);

    return super.attach(position, adjacentRelation);
  }

  inline() {
    throw new Error(
      'HtmlOpenGraph: Inlining of open graph relations is not allowed'
    );
  }
}

module.exports = HtmlOpenGraph;
