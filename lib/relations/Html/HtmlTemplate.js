const HtmlRelation = require('../HtmlRelation');

class HtmlTemplate extends HtmlRelation {
  static getRelationsFromNode(node) {
    if (node.nodeType === node.ELEMENT_NODE && node.matches('template')) {
      return {
        type: 'HtmlTemplate',
        to: {
          type: 'Html',
          isFragment: true,
          isInline: true,
          text: node.innerHTML || ''
        },
        node
      };
    }
  }

  inline() {
    super.inline();
    this.node.innerHTML = this.to.text;
    this.from.markDirty();
    return this;
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('template');
    return super.attach(position, adjacentRelation);
  }
}

HtmlTemplate.prototype._hrefType = 'inline';

module.exports = HtmlTemplate;
