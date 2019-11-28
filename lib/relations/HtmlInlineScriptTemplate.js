const HtmlRelation = require('./HtmlRelation');

class HtmlInlineScriptTemplate extends HtmlRelation {
  inlineHtmlRelation() {
    this.node.textContent = this.to.text;
    this.from.markDirty();
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('script');
    this.node.setAttribute('type', this.to.contentType);

    return super.attach(position, adjacentRelation);
  }
}

HtmlInlineScriptTemplate.prototype._hrefType = 'inline';

module.exports = HtmlInlineScriptTemplate;
