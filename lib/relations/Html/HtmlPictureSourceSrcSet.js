const HtmlRelation = require('../HtmlRelation');

class HtmlPictureSourceSrcSet extends HtmlRelation {
  static get selector() {
    return 'picture > source[srcset]';
  }

  static handler(node) {
    return {
      type: 'HtmlPictureSourceSrcSet',
      to: {
        type: 'SrcSet',
        text: node.getAttribute('srcset')
      },
      node
    };
  }

  inline() {
    super.inline();
    this.node.setAttribute('srcset', this.to.text);
    this.from.markDirty();
    return this;
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('source');
    return super.attach(position, adjacentRelation);
  }
}

HtmlPictureSourceSrcSet.prototype._hrefType = 'inline';

module.exports = HtmlPictureSourceSrcSet;
