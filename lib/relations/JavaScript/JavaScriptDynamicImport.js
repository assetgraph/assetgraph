const JavaScriptRelation = require('../JavaScriptRelation');

// Avoid modelling "bare" imports as relations (import { uniq } from 'lodash')
function isImportUrl(href) {
  return /^\.{0,2}\/|^[a-z0-9+]+:/.test(href);
}

class JavaScriptDynamicImport extends JavaScriptRelation {
  static get selector() {
    return '!ImportExpression > Literal.source[value=type(string)]';
  }

  static handler(node) {
    if (isImportUrl(node.source.value)) {
      return {
        type: 'JavaScriptDynamicImport',
        node,
        href: node.source.value,
      };
    }
  }

  get href() {
    return this.node.source.value;
  }

  set href(href) {
    this.node.source.value = href;
  }

  attach(position, adjacentRelation) {
    throw new Error('Not implemented yet');
  }

  detach() {
    throw new Error('Not implemented yet');
  }
}

Object.assign(JavaScriptDynamicImport.prototype, {
  targetType: 'JavaScript',

  nonBareRelative: true,
});

module.exports = JavaScriptDynamicImport;
