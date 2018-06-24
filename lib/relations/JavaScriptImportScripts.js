const Relation = require('./Relation');

class JavaScriptImportScripts extends Relation {
  get href() {
    return this.node.value;
  }

  set href(href) {
    this.node.value = href;
  }

  inline() {
    throw new Error('JavaScriptImportScripts.inline(): Not supported');
  }

  attach(position, adjacentRelation) {
    this.node = { type: 'Literal', value: '<urlGoesHere>' };
    if (position === 'before' || position === 'after') {
      this.detachableNode = adjacentRelation.detachableNode;
      this.argumentsNode = adjacentRelation.argumentsNode;
      this.parentNode = adjacentRelation.parentNode;
      const argumentsNodeIndex = this.argumentsNode.indexOf(
        adjacentRelation.node
      );
      if (argumentsNodeIndex === -1) {
        throw new Error(
          'JavaScriptImportScripts.attach: adjacentRelation.node not found in adjacentRelation.argumentsNode'
        );
      }
      this.argumentsNode.splice(
        argumentsNodeIndex + (position === 'after' ? 1 : 0),
        0,
        this.node
      );
    } else {
      this.parentNode = this.from.parseTree;
      this.detachableNode = {
        type: 'ExpressionStatement',
        expression: {
          type: 'CallExpression',
          callee: {
            type: 'Identifier',
            name: 'importScripts'
          },
          arguments: [this.node]
        }
      };
      if (position === 'first') {
        this.parentNode.body.unshift(this.detachableNode);
      } else if (position === 'last') {
        this.parentNode.body.push(this.detachableNode);
      } else {
        throw new Error(
          `JavaScriptImportScripts.attach: Unsupported 'position' value: ${position}`
        );
      }
    }
    return super.attach(position, adjacentRelation);
  }

  detach() {
    const i = this.argumentsNode.indexOf(this.node);
    if (i === -1) {
      throw new Error(
        'relations.JavaScriptWebWorker.detach: this.node not found in module array of this.arrayNode.'
      );
    }
    this.argumentsNode.splice(i, 1);
    if (this.argumentsNode.length === 0) {
      // Remove the importScripts() call instead of leaving it with no arguments
      if (this.parentNode.type === 'SequenceExpression') {
        this.parentNode.expressions.splice(
          this.parentNode.expressions.indexOf(this.detachableNode),
          1
        );
      } else {
        this.parentNode.body.splice(
          this.parentNode.body.indexOf(this.detachableNode),
          1
        );
      }
    }
    return super.detach();
  }
}

JavaScriptImportScripts.prototype.targetType = 'JavaScript';

module.exports = JavaScriptImportScripts;
