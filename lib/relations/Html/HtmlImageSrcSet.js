const HtmlRelation = require('../HtmlRelation');

class HtmlImageSrcSet extends HtmlRelation {
  static getRelationsFromNode(node) {
    if (node.nodeType === node.ELEMENT_NODE && node.matches('img[srcset]')) {
      return {
        type: 'HtmlImageSrcSet',
        to: {
          type: 'SrcSet',
          text: node.getAttribute('srcset'),
        },
        node,
      };
    }
  }

  inlineHtmlRelation() {
    this.node.setAttribute(this.attributeName, this.to.text);
    this.from.markDirty();
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('img');
    return super.attach(position, adjacentRelation);
  }
}

Object.assign(HtmlImageSrcSet.prototype, {
  targetType: 'SrcSet',
  _hrefType: 'inline',
  attributeName: 'srcset',
});

module.exports = HtmlImageSrcSet;
