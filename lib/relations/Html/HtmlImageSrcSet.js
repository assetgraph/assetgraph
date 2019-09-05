const HtmlRelation = require('../HtmlRelation');

class HtmlImageSrcSet extends HtmlRelation {
  static get selector() {
    return 'img[srcset]';
  }

  static handler(node) {
    return {
      type: 'HtmlImageSrcSet',
      to: {
        type: 'SrcSet',
        text: node.getAttribute('srcset')
      },
      node
    };
  }

  inline() {
    super.inline();
    this.node.setAttribute(this.attributeName, this.to.text);
    this.from.markDirty();
    return this;
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('img');
    return super.attach(position, adjacentRelation);
  }
}

Object.assign(HtmlImageSrcSet.prototype, {
  targetType: 'SrcSet',
  _hrefType: 'inline',
  attributeName: 'srcset'
});

module.exports = HtmlImageSrcSet;
