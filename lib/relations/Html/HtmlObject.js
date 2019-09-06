const HtmlRelation = require('../HtmlRelation');

// Requires: config.attributeName
class HtmlObject extends HtmlRelation {
  static get selector() {
    return 'object[data]';
  }

  static handler(node) {
    return {
      type: 'HtmlObject',
      href: node.getAttribute('data'),
      node,
      attributeName: 'data'
    };
  }

  get href() {
    return this.node.getAttribute(this.attributeName);
  }

  set href(href) {
    this.node.setAttribute(this.attributeName, href);
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('object');
    return super.attach(position, adjacentRelation);
  }
}

module.exports = HtmlObject;
