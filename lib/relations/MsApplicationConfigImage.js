const Relation = require('./Relation');

class MsApplicationConfigImage extends Relation {
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
