const SvgRelation = require('./SvgRelation');

class SvgUse extends SvgRelation {
  static get selector() {
    return 'use';
  }

  static handler(node) {
    let href;
    let isXlink = false;
    if (node.hasAttributeNS('http://www.w3.org/1999/xlink', 'href')) {
      href = node.getAttributeNS('http://www.w3.org/1999/xlink', 'href');
      isXlink = true;
    } else if (node.hasAttribute('href')) {
      href = node.getAttribute('href');
      isXlink = false;
    }
    if (href) {
      return {
        type: 'SvgUse',
        isXlink,
        href,
        node
      };
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
    this.node = this.from.parseTree.createElement('use');
    return super.attach(position, adjacentRelation);
  }
}

SvgUse.prototype.targetType = 'Svg';

module.exports = SvgUse;
