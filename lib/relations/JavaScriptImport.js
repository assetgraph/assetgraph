const Relation = require('./Relation');

class JavaScriptImport extends Relation {
  get href() {
    return this.node.source.value;
  }

  set href(href) {
    this.node.source.value = href;
  }

  attach(position, adjacentRelation) {
    this.node = {
      type: 'ImportDeclaration',
      specifiers: [],
      source: { type: 'Literal', value: '<urlGoesHere>' }
    };
    if (position === 'last') {
      const otherOutgoingJavaScriptImports = this.from.outgoingRelations.filter(
        relation => relation !== this && relation.type === 'JavaScriptImport'
      );
      if (otherOutgoingJavaScriptImports.length > 0) {
        position = 'after';
        adjacentRelation =
          otherOutgoingJavaScriptImports[
            otherOutgoingJavaScriptImports.length - 1
          ];
      } else {
        position = 'first';
      }
    }
    if (position === 'first') {
      this.from.parseTree.body.unshift(this.node);
    }
    if (position === 'before' || position === 'after') {
      const i = this.from.parseTree.body.indexOf(adjacentRelation.node);
      if (i === -1) {
        throw new Error(
          'JavaScriptImport#attach: adjacentRelation.node not found in adjacentRelation.from.parseTree.body'
        );
      }
      this.from.parseTree.body.splice(
        i + (position === 'after' ? 1 : 0),
        0,
        this.node
      );
    }
    return super.attach(position, adjacentRelation);
  }

  detach() {
    const i = this.from.parseTree.body.indexOf(this.node);
    if (i === -1) {
      throw new Error(
        'relations.JavaScriptImport#detach: this.node not found in module array of this.from.parseTree.body.'
      );
    }
    this.from.parseTree.body.splice(i, 1);
    return super.detach();
  }
}

JavaScriptImport.prototype.targetType = 'JavaScript';

module.exports = JavaScriptImport;
