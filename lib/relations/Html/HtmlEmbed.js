const HtmlRelation = require('../HtmlRelation');

class HtmlEmbed extends HtmlRelation {
  static get selector() {
    return 'embed[src]';
  }

  static handler(node) {
    return {
      type: 'HtmlEmbed',
      href: node.getAttribute('src'),
      node
    };
  }

  get href() {
    return this.node.getAttribute('src');
  }

  set href(href) {
    this.node.setAttribute('src', href);
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('embed');
    return super.attach(position, adjacentRelation);
  }
}

module.exports = HtmlEmbed;
