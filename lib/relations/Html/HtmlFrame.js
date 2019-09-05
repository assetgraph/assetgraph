const HtmlRelation = require('../HtmlRelation');

class HtmlFrame extends HtmlRelation {
  static get selector() {
    return 'frame[src]';
  }

  static handler(node) {
    return {
      type: 'HtmlFrame',
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
    this.node = this.from.parseTree.createElement('frame');
    return super.attach(position, adjacentRelation);
  }
}

module.exports = HtmlFrame;
