const Relation = require('./Relation');

class JavaScriptDynamicImport extends Relation {
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

  nonBareRelative: true
});

module.exports = JavaScriptDynamicImport;
