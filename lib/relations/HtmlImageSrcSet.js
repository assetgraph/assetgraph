const HtmlRelation = require('./HtmlRelation');

class HtmlImageSrcSet extends HtmlRelation {
  inline() {
    super.inline();
    if (this.node.hasAttribute("srcset")) {
      this.node.setAttribute('srcset', this.to.text);
    } else if (this.node.hasAttribute("data-srcset")) {
      this.node.setAttribute('data-srcset', this.to.text);
    } else {
      this.node.setAttribute('srcset', this.to.text);
    }
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
  _hrefType: 'inline'
});

module.exports = HtmlImageSrcSet;
