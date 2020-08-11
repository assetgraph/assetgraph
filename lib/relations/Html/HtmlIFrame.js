const HtmlRelation = require('../HtmlRelation');

class HtmlIFrame extends HtmlRelation {
  static getRelationsFromNode(node) {
    if (node.nodeType === node.ELEMENT_NODE && node.matches('iframe[src]')) {
      return {
        type: 'HtmlIFrame',
        href: node.getAttribute('src'),
        node,
      };
    }
  }

  get href() {
    return this.node.getAttribute('src');
  }

  set href(href) {
    this.node.setAttribute('src', href);
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('iframe');
    return super.attach(position, adjacentRelation);
  }
}

module.exports = HtmlIFrame;
