const HtmlRelation = require('./HtmlRelation');

class HtmlTemplate extends HtmlRelation {
  inlineHtmlRelation() {
    this.node.innerHTML = this.to.text;
    this.from.markDirty();
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('template');
    return super.attach(position, adjacentRelation);
  }
}

HtmlTemplate.prototype._hrefType = 'inline';

module.exports = HtmlTemplate;
