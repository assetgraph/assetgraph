const HtmlRelation = require('./HtmlRelation');

class HtmlPictureSourceSrcSet extends HtmlRelation {
  inlineHtmlRelation() {
    this.node.setAttribute('srcset', this.to.text);
    this.from.markDirty();
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('source');
    return super.attach(position, adjacentRelation);
  }
}

HtmlPictureSourceSrcSet.prototype._hrefType = 'inline';

module.exports = HtmlPictureSourceSrcSet;
