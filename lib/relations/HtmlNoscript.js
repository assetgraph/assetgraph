const HtmlRelation = require('./HtmlRelation');

class HtmlNoscript extends HtmlRelation {
  inlineHtmlRelation() {
    this.node.innerHTML = this.to.text;
    this.from.markDirty();
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('noscript');
    return super.attach(position, adjacentRelation);
  }
}

Object.assign(HtmlNoscript.prototype, {
  targetType: 'Html',
  _hrefType: 'inline',
});

module.exports = HtmlNoscript;
