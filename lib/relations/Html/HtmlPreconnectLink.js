const HtmlResourceHint = require('./HtmlResourceHint');

/**
 * @constructor
 * @augments HtmlResourceHint
 * Implementation of https://www.w3.org/TR/resource-hints/#preconnect
 */
class HtmlPreconnectLink extends HtmlResourceHint {
  static getRelationsFromNode(node) {
    if (
      node.nodeType === node.ELEMENT_NODE &&
      node.matches('link[href][rel~=preconnect]')
    ) {
      return {
        type: 'HtmlPreconnectLink',
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

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('link');
    this.node.setAttribute('rel', 'preconnect');

    return super.attach(position, adjacentRelation);
  }

  inlineHtmlRelation() {
    throw new Error(
      'HtmlPreconnectLink: Inlining of resource hints is not allowed'
    );
  }
}

module.exports = HtmlPreconnectLink;
