const HtmlResourceHint = require('./HtmlResourceHint');

/** @typedef {import('../HtmlRelation')} HtmlRelation */
/** @typedef {import('../HtmlRelation').HtmlRelationConfig} HtmlRelationConfig */
/** @typedef {import('../Relation').RelationAttachmentPosition} RelationAttachmentPosition */

/**
 * @extends {HtmlResourceHint}
 *
 * Implementation of http://w3c.github.io/preload/#dfn-preload
 */
class HtmlPreloadLink extends HtmlResourceHint {
  /**
   * @param {HTMLElement} node
   * @return {HtmlRelationConfig}
   */
  static getRelationsFromNode(node) {
    if (
      node.nodeType === node.ELEMENT_NODE &&
      node.matches('link[href][rel~=preload]')
    ) {
      return {
        type: 'HtmlPreloadLink',
        from: this,
        to: {
          url: node.getAttribute('href'),
          contentType: node.getAttribute('type') || undefined
        },
        as: node.getAttribute('as') || undefined,
        node
      };
    }
  }

  /**
   * @param {RelationAttachmentPosition} position
   * @param {HTMLElement | HtmlRelation} adjacentRelation
   */
  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('link');
    this.node.setAttribute('rel', 'preload');

    if (this.as) {
      this.node.setAttribute('as', this.as);
    }

    if (this.contentType) {
      this.node.setAttribute('type', this.contentType);
    }

    if (['font', 'fetch'].includes(this.as)) {
      this.node.setAttribute('crossorigin', 'anonymous');
    }

    super.attach(position, adjacentRelation);
  }
}

module.exports = HtmlPreloadLink;
