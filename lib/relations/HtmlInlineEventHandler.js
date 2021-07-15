const HtmlRelation = require('./HtmlRelation');

class HtmlInlineEventHandler extends HtmlRelation {
  get href() {
    return this.node.getAttribute(this.attributeName);
  }

  set href(href) {
    return this.node.setAttribute(this.attributeName, href);
  }

  inlineHtmlRelation() {
    this.href = this.to.text.replace(/^function[^{]*\{\s*|\s*};?\s*$/g, '');
    this.from.markDirty();
  }

  attach() {
    throw new Error('HtmlInlineEventHandler.attach: Not supported.');
  }

  detach() {
    this.node.removeAttribute(this.attributeName);
    this.node = undefined;
    return super.detach();
  }
}

Object.assign(HtmlInlineEventHandler.prototype, {
  targetType: 'JavaScript',
  _hrefType: 'inline',
});

module.exports = HtmlInlineEventHandler;
