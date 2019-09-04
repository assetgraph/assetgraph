const HtmlRelation = require('../HtmlRelation');

class HtmlImageSrcSet extends HtmlRelation {
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
