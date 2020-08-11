const HtmlRelation = require('../HtmlRelation');

/**
 * @extends {HtmlRelation}
 *
 * Implementation of https://www.w3.org/TR/resource-hints/#dns-prefetch
 */
class HtmlDnsPrefetchLink extends HtmlRelation {
  static getRelationsFromNode(node) {
    if (
      node.nodeType === node.ELEMENT_NODE &&
      node.matches('link[href][rel~=dns-prefetch]')
    ) {
      return {
        type: 'HtmlDnsPrefetchLink',
        href: node.getAttribute('href'),
        node,
      };
    }
  }

  get href() {
    return this.node.getAttribute('href');
  }

  set href(href) {
    this.node.setAttribute('href', href);
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('link');
    this.node.setAttribute('rel', 'dns-prefetch');

    return super.attach(position, adjacentRelation);
  }

  inlineHtmlRelation() {
    throw new Error(
      'HtmlDnsPrefetchLink: Inlining of resource hints is not allowed'
    );
  }
}

module.exports = HtmlDnsPrefetchLink;
