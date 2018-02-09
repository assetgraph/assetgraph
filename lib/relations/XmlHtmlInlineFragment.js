const HtmlRelation = require('./HtmlRelation');

class XmlHtmlInlineFragment extends HtmlRelation {
  inline() {
    super.inline();
    this.node.textContent = this.to.text;
    this.from.markDirty();
    return this;
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement(this.node.nodeName);
    super.attach(position, adjacentRelation);
  }
}

Object.assign(XmlHtmlInlineFragment.prototype, {
  targetType: 'Html',
  _hrefType: 'inline'
});

module.exports = XmlHtmlInlineFragment;
