const HtmlRelation = require('../HtmlRelation');

class HtmlKnockoutContainerless extends HtmlRelation {
  static getRelationsFromNode(node) {
    if (node.nodeType === node.COMMENT_NODE) {
      const matchKnockoutContainerless = node.nodeValue.match(
        /^\s*ko\s+([\s\S]+)$/
      );
      if (matchKnockoutContainerless) {
        return {
          type: 'HtmlKnockoutContainerless',
          to: {
            type: 'JavaScript',
            isExternalizable: false,
            serializationOptions: {
              semicolons: true,
              side_effects: false,
              newline: '',
              indent_level: 0
            },
            text: `({${matchKnockoutContainerless[1]}});`
          },
          node
        };
      }
    }
  }

  inlineHtmlRelation() {
    this.node.nodeValue = `${
      this.to.isPretty ? ' ' : ''
    }ko ${this.to.text.replace(/^\(\{\s*|\s*\}\);?$/g, '')}${
      this.to.isPretty ? ' ' : ''
    }`;
    this.from.markDirty();
  }

  attach() {
    throw new Error('HtmlKnockoutContainerless.attach: Not supported.');
  }

  detach() {
    this.node.parentNode.removeChild(this.node);
    this.node = undefined;
    return super.detach();
  }
}

Object.assign(HtmlKnockoutContainerless.prototype, {
  targetType: 'JavaScript',
  _hrefType: 'inline'
});

module.exports = HtmlKnockoutContainerless;
