const HtmlRelation = require('../HtmlRelation');

class HtmlContentSecurityPolicy extends HtmlRelation {
  static getRelationsFromNode(node) {
    if (
      node.nodeType === node.ELEMENT_NODE &&
      node.matches(
        'meta[http-equiv=Content-Security-Policy], meta[http-equiv=Content-Security-Policy-Report-Only]'
      )
    ) {
      return {
        type: 'HtmlContentSecurityPolicy',
        isExternalizable: false,
        to: {
          type: 'ContentSecurityPolicy',
          text: node.getAttribute('content')
        },
        node
      };
    }
  }

  inline() {
    super.inline();
    this.node.setAttribute('content', this.to.text);
    this.from.markDirty();
    return this;
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('meta');
    this.node.setAttribute('http-equiv', 'Content-Security-Policy');
    return super.attach(position, adjacentRelation);
  }
}

Object.assign(HtmlContentSecurityPolicy.prototype, {
  targetType: 'ContentSecurityPolicy',
  _hrefType: 'inline'
});

module.exports = HtmlContentSecurityPolicy;
