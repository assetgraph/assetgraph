const HtmlRelation = require('../HtmlRelation');

class HtmlVideo extends HtmlRelation {
  // Should probably be split into two relation classes:
  static get selector() {
    return 'video[src], video > source[src]';
  }

  static handler(node) {
    return {
      type: 'HtmlVideo',
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
    this.node = this.from.parseTree.createElement('video');
    return super.attach(position, adjacentRelation);
  }
}

module.exports = HtmlVideo;
