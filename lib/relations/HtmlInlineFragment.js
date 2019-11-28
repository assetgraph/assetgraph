const HtmlRelation = require('./HtmlRelation');

class HtmlInlineFragment extends HtmlRelation {
  inlineHtmlRelation() {
    this.node.innerHTML = this.to.text;
    this.from.markDirty();
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement(this.node.nodeName);
    return super.attach(position, adjacentRelation);
  }
}

module.exports = HtmlInlineFragment;
