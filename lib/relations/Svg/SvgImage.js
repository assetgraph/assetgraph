const SvgRelation = require('./SvgRelation');

class SvgImage extends SvgRelation {
  static get selector() {
    return 'image';
  }

  static handler(node) {
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
        type: 'SvgImage',
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
    this.node = this.from.parseTree.createElement('image');
    return super.attach(position, adjacentRelation);
  }
}

SvgImage.prototype.targetType = 'Image';

module.exports = SvgImage;
