const JavaScriptRelation = require('./JavaScriptRelation');

class JavaScriptDynamicImport extends JavaScriptRelation {
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
