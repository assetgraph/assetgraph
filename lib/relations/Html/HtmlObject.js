const HtmlRelation = require('../HtmlRelation');

// Requires: config.attributeName
class HtmlObject extends HtmlRelation {
  // Should probably be split into two or three relation classes:
  static get selector() {
    return 'object[data], object > param[name=src i][value], object > param[name=movie i][value]';
  }

  static handler(node) {
    if (node.nodeName.toLowerCase() === 'param') {
      return {
        type: 'HtmlObject',
        href: node.getAttribute('value'),
        node,
        attributeName: 'value'
      };
    } else {
      // node.nodeName.toLowerCase() === 'object'
      return {
        type: 'HtmlObject',
        href: node.getAttribute('data'),
        node,
        attributeName: 'data'
      };
    }
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
