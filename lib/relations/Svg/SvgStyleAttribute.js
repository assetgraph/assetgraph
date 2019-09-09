const SvgRelation = require('./SvgRelation');

class SvgStyleAttribute extends SvgRelation {
  static get selector() {
    return '[style]';
  }

  static handler(node) {
    return {
      type: 'SvgStyleAttribute',
      to: {
        type: 'Css',
        isExternalizable: false,
        text: `bogusselector {${node.getAttribute('style')}}`
      },
      node
    };
  }

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
