const SvgRelation = require('./SvgRelation');

class SvgAnchor extends SvgRelation {
  static getRelationsFromNode(node) {
    if (node.nodeType === node.ELEMENT_NODE && node.matches('a')) {
      let href;
      let isXlink = false;
      if (node.getAttributeNS('http://www.w3.org/1999/xlink', 'href')) {
        href = node.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
        isXlink = true;
      } else if (node.hasAttribute('href')) {
        href = node.getAttribute('href');
        isXlink = false;
      }
      if (href) {
        return {
          type: 'SvgAnchor',
          isXlink,
          href,
          node,
        };
      }
    }
  }

  get href() {
    if (this.isXlink) {
      return this.node.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
    } else {
      return this.node.getAttribute('href');
    }
  }

  set href(href) {
    if (this.isXlink) {
      this.node.setAttributeNS(
        'http://www.w3.org/1999/xlink',
        'xlink:href',
        href
      );
    } else {
      this.node.setAttribute('href', href);
    }
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('a');
    return super.attach(position, adjacentRelation);
  }
}

module.exports = SvgAnchor;
