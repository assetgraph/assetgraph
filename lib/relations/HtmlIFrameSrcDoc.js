const HtmlRelation = require('./HtmlRelation');

class HtmlIFrameSrcDoc extends HtmlRelation {
  inlineHtmlRelation() {
    this.node.setAttribute('srcdoc', this.to.text);
    this.from.markDirty();
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('iframe');
    return super.attach(position, adjacentRelation);
  }
}

HtmlIFrameSrcDoc.prototype._hrefType = 'inline';

module.exports = HtmlIFrameSrcDoc;
