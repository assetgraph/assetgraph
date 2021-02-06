const replaceDescendantNode = require('../replaceDescendantNode');
const JavaScriptRelation = require('./JavaScriptRelation');

class JavaScriptStaticUrl extends JavaScriptRelation {
  get href() {
    return this.argumentNode.value;
  }

  set href(href) {
    this.argumentNode.value = this._fixupSetHref(href);
  }

  inline() {
    throw new Error('Not implemented');
  }

  attach() {
    throw new Error('Not implemented');
  }

  detach() {
    throw new Error('Not implemented');
  }

  omitFunctionCall() {
    replaceDescendantNode(this.parentNode, this.node, this.argumentNode);
    this.from.markDirty();
  }
}

module.exports = JavaScriptStaticUrl;
