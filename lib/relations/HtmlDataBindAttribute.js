const HtmlRelation = require('./HtmlRelation');

class HtmlDataBindAttribute extends HtmlRelation {
  inlineHtmlRelation() {
    this.node.setAttribute(
      this.propertyName,
      this.to.text.replace(/^\(\{\s*|\s*\}\);?$/g, '')
    );
    this.from.markDirty();
  }

  attach() {
    throw new Error('HtmlDataBindAttribute.attach: Not supported.');
  }

  detach() {
    this.node.removeAttribute(this.propertyName);
    this.node = undefined;
    return super.detach();
  }
}

Object.assign(HtmlDataBindAttribute.prototype, {
  propertyName: 'data-bind',
  targetType: 'JavaScript',
  _hrefType: 'inline',
});

module.exports = HtmlDataBindAttribute;
