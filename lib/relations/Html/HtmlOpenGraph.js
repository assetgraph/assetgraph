const HtmlRelation = require('../HtmlRelation');

class HtmlOpenGraph extends HtmlRelation {
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
        ogProperty: node.getAttribute('property'),
      };
    }
  }

  get href() {
    return this.node.getAttribute('content');
  }

  set href(href) {
    this.node.setAttribute('content', href);
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('meta');
    this.node.setAttribute('property', this.ogProperty);

    super.attach(position, adjacentRelation);
  }

  inlineHtmlRelation() {
    throw new Error(
      'HtmlOpenGraph: Inlining of open graph relations is not allowed'
    );
  }
}

module.exports = HtmlOpenGraph;
