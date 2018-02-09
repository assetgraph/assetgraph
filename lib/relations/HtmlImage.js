const HtmlRelation = require('./HtmlRelation');

class HtmlImage extends HtmlRelation {
  get href() {
    return this.node.getAttribute('src');
  }

  set href(href) {
    this.node.setAttribute('src', href);
  }

  get decoding() {
    if (this.node) {
      const decoding = this.node.getAttribute('decoding');
      if (decoding) {
        return decoding.trim().toLowerCase();
      }
    } else {
      return this._decoding;
    }
  }

  set decoding(decoding) {
    if (this.node) {
      if (decoding) {
        this.node.setAttribute('decoding', decoding.trim().toLowerCase());
        this.from.markDirty();
      } else if (this.node.hasAttribute('decoding')) {
        this.from.markDirty();
        this.node.removeAttribute('decoding');
      }
    } else {
      this._decoding = decoding;
    }
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('img');
    if (this._decoding) {
      this.node.setAttribute('decoding', this._decoding.trim().toLowerCase());
      this._decoding = undefined;
    }
    return super.attach(position, adjacentRelation);
  }

  detach() {
    this._decoding = this.decoding;
    super.detach();
  }
}

HtmlImage.prototype.targetType = 'Image';

module.exports = HtmlImage;
