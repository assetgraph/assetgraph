const HtmlRelation = require('../HtmlRelation');

class HtmlInlineScriptTemplate extends HtmlRelation {
  static get selector() {
    return 'script[type="text/html"], script[type="text/ng-template]';
  }

  static handler(node) {
    return {
      type: 'HtmlInlineScriptTemplate',
      to: {
        type: 'Html',
        isExternalizable: false,
        text: node.innerHTML || ''
      },
      node
    };
  }

  inline() {
    super.inline();
    this.node.textContent = this.to.text;
    this.from.markDirty();
    return this;
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.createElement('script');
    this.node.setAttribute('type', this.to.contentType);

    return super.attach(position, adjacentRelation);
  }
}

HtmlInlineScriptTemplate.prototype._hrefType = 'inline';

module.exports = HtmlInlineScriptTemplate;
