const replaceDescendantNode = require('../../replaceDescendantNode');
const Relation = require('../Relation');

class JavaScriptFetch extends Relation {
  static get selectors() {
    return {
      '!CallExpression[arguments.0.type=Literal][arguments.0.value=type(string)]:has(Identifier.callee[name=fetch], MemberExpression.callee[computed=false]:has(Identifier.object[name=window]) > Identifier.property[name=fetch])'(
        node,
        [parentNode, parentParentNode]
      ) {
        return {
          type: 'JavaScriptFetch',
          detachableNode:
            parentNode.type === 'SequenceExpression' ? node : parentNode,
          parentNode:
            parentNode.type === 'SequenceExpression'
              ? parentNode
              : parentParentNode,
          node: node.arguments[0],
          href: node.arguments[0].value
        };
      }
    };
  }

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
    throw new Error('JavaScriptFetch.attach(): Not implemented');
  }

  detach() {
    throw new Error('JavaScriptFetch.detach(): Not implemented');
  }
}

module.exports = JavaScriptFetch;
