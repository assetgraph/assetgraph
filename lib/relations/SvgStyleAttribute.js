const SvgRelation = require('./SvgRelation');

class SvgStyleAttribute extends SvgRelation {
  inline() {
    super.inline();
    this.node.setAttribute(
      'style',
      this.to.text.replace(/^bogusselector\s*\{|}\s*$/g, '')
    );
    this.from.markDirty();
    return this;
  }

  attach() {
    throw new Error('SvgStyleAttribute.attach: Not supported.');
  }

  detach() {
    this.node.removeAttribute('style');
    this.node = undefined;
    return super.detach();
  }
}

Object.assign(SvgStyleAttribute.prototype, {
  targetType: 'Css',
  _hrefType: 'inline'
});

module.exports = SvgStyleAttribute;
