const HtmlRelation = require('../HtmlRelation');

class HtmlNoscript extends HtmlRelation {
  static getRelationsFromNode(node) {
    if (node.nodeType === node.ELEMENT_NODE && node.matches('noscript')) {
      return {
        type: 'HtmlNoscript',
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
    this.node = this.from.parseTree.createElement('noscript');
    return super.attach(position, adjacentRelation);
  }
}

Object.assign(HtmlNoscript.prototype, {
  targetType: 'Html',
  _hrefType: 'inline'
});

module.exports = HtmlNoscript;
