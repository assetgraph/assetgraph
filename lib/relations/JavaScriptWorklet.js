const replaceDescendantNode = require('../replaceDescendantNode');
const Relation = require('./Relation');

class JavaScriptWorklet extends Relation {
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
    throw new Error('JavaScriptWorklet.attach(): Not implemented');
  }

  detach() {
    throw new Error('JavaScriptWorklet.detach(): Not implemented');
  }
}

JavaScriptWorklet.prototype.targetType = 'JavaScript';

module.exports = JavaScriptWorklet;
