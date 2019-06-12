const replaceDescendantNode = require('../replaceDescendantNode');
const Relation = require('./Relation');

class JavaScriptPaintWorklet extends Relation {
  get href() {
    return this.node.value;
  }

  set href(href) {
    this.node.value = href;
  }

  inline() {
    super.inline();
    const newNode = { type: 'Literal', value: this.to.dataUrl };
    replaceDescendantNode(this.parentNode, this.node, newNode);
    this.node = newNode;
    this.from.markDirty();
    return this;
  }

  attach() {
    throw new Error('JavaScriptPaintWorklet.attach(): Not implemented');
  }

  detach() {
    throw new Error('JavaScriptPaintWorklet.detach(): Not implemented');
  }
}

JavaScriptPaintWorklet.prototype.targetType = 'JavaScript';

module.exports = JavaScriptPaintWorklet;
