const replaceDescendantNode = require('../../replaceDescendantNode');
const JavaScriptRelation = require('../JavaScriptRelation');

class JavaScriptStaticUrl extends JavaScriptRelation {
  static get selector() {
    return '!CallExpression[arguments.length=1][arguments.0.value=url] > MemberExpression.callee > Identifier.property[name=toString]';
  }

  static handler(node, stack) {
    return {
      type: 'JavaScriptStaticUrl',
      node,
      argumentNode: node.callee.object,
      parentNode: stack[0],
      href: node.callee.object.value,
    };
  }

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
