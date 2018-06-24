const HtmlRelation = require('./HtmlRelation');

class HtmlKnockoutContainerless extends HtmlRelation {
  inline() {
    super.inline();
    this.node.nodeValue = `${
      this.to.isPretty ? ' ' : ''
    }ko ${this.to.text.replace(/^\(\{\s*|\s*\}\);?$/g, '')}${
      this.to.isPretty ? ' ' : ''
    }`;
    this.from.markDirty();
    return this;
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
