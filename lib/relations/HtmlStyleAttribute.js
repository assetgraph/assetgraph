const HtmlRelation = require('./HtmlRelation');

class HtmlStyleAttribute extends HtmlRelation {
  get href() {
    return this.node.getAttribute('style');
  }

  set href(href) {
    return this.node.setAttribute('style', href);
  }

  inline() {
    super.inline();
    this.href = this.to.text.replace(/^bogusselector\s*\{\s*|\s*}\s*$/g, '');
    this.from.markDirty();
    return this;
  }

  attach() {
    throw new Error('HtmlStyleAttribute.attach: Not supported.');
  }

  detach() {
    this.node.removeAttribute('style');
    this.node = undefined;
    return super.detach();
  }
}

Object.assign(HtmlStyleAttribute.prototype, {
  targetType: 'Css',
  _hrefType: 'inline'
});

module.exports = HtmlStyleAttribute;
