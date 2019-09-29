const HtmlRelation = require('../HtmlRelation');

class HtmlIFrameSrcDoc extends HtmlRelation {
  static getRelationsFromNode(node) {
    if (node.nodeType === node.ELEMENT_NODE && node.matches('iframe[srcdoc]')) {
      return {
        type: 'HtmlIFrameSrcDoc',
        to: {
          type: 'Html',
          text: node.getAttribute('srcdoc')
        },
        node
      };
    }
  }

  inline() {
    super.inline();
    this.node.setAttribute('srcdoc', this.to.text);
    this.from.markDirty();
    return this;
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('iframe');
    return super.attach(position, adjacentRelation);
  }
}

HtmlIFrameSrcDoc.prototype._hrefType = 'inline';

module.exports = HtmlIFrameSrcDoc;
