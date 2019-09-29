const Relation = require('../Relation');

class MsApplicationConfigImage extends Relation {
  static getRelationsFromNode(node) {
    if (
      node.nodeType === node.ELEMENT_NODE &&
      node.matches(
        'TileImage, square70x70logo, square150x150logo, wide310x150logo, square310x310logo'
      )
    ) {
      return {
        type: 'MsApplicationConfigImage',
        href: node.getAttribute('src'),
        node
      };
    }
  }

  get href() {
    return this.node.getAttribute('src');
  }

  set href(href) {
    this.node.setAttribute('src', href);
  }

  inline() {
    this.href = this.to.dataUrl + (this.fragment || '');
    super.inline();
    return this;
  }

  attach() {
    throw new Error('MsApplicationConfigImage.attach: Not supported');
  }

  detach() {
    this.node.parentNode.removeChild(this.node);
    this.node = undefined;
    return super.detach();
  }
}

MsApplicationConfigImage.prototype.targetType = 'Image';

module.exports = MsApplicationConfigImage;
