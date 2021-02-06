const replaceDescendantNode = require('../replaceDescendantNode');
const JavaScriptRelation = require('./JavaScriptRelation');

class JavaScriptFetch extends JavaScriptRelation {
  get href() {
    return this.node.value;
  }

  set href(href) {
    this.node.value = this._fixupSetHref(href);
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
    throw new Error('JavaScriptFetch.attach(): Not implemented');
  }

  detach() {
    throw new Error('JavaScriptFetch.detach(): Not implemented');
  }
}

module.exports = JavaScriptFetch;
