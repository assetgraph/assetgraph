const HtmlRelation = require('../HtmlRelation');

class HtmlPictureSourceSrcSet extends HtmlRelation {
  static getRelationsFromNode(node) {
    if (
      node.nodeType === node.ELEMENT_NODE &&
      node.matches('picture > source[srcset]')
    ) {
      return {
        type: 'HtmlPictureSourceSrcSet',
        to: {
          type: 'SrcSet',
          text: node.getAttribute('srcset')
        },
        node
      };
    }
  }

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
