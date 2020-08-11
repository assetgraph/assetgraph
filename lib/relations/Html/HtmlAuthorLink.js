const HtmlRelation = require('../HtmlRelation');

class HtmlAuthorLink extends HtmlRelation {
  static getRelationsFromNode(node) {
    if (
      node.nodeType === node.ELEMENT_NODE &&
      node.matches('link[href][rel~=author]')
    ) {
      return {
        type: 'HtmlAuthorLink',
        to: {
          url: node.getAttribute('href'),
          contentType: node.getAttribute('type') || undefined,
        },
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
    this.node.setAttribute('rel', 'author');
    this.node.setAttribute('type', this.to.contentType);
    return super.attach(position, adjacentRelation);
  }
}

module.exports = HtmlAuthorLink;
