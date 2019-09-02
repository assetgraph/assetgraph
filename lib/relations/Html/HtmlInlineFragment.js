const HtmlRelation = require('./HtmlRelation');

class HtmlInlineFragment extends HtmlRelation {
  inline() {
    super.inline();
    this.node.innerHTML = this.to.text;
    this.from.markDirty();
    return this;
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement(this.node.nodeName);
    return super.attach(position, adjacentRelation);
  }
}

module.exports = HtmlInlineFragment;
