const Relation = require('./Relation');

class JavaScriptSourceUrl extends Relation {
  get href() {
    return this.node.value.match(/[@#]\s*sourceURL=([^\s]*)/)[1];
  }

  set href(href) {
    this.node.value = this.node.value.replace(
      /([@#]\s*sourceURL=)[^\s]*/,
      `$1${href}`
    );
  }

  inline() {
    throw new Error('JavaScriptSourceUrl.inline(): Not supported');
  }

  attach(position, adjacentRelation) {
    if (position !== 'last') {
      throw new Error(
        "JavaScriptSourceUrl.attach(): Only position === 'last' is supported"
      );
    }
    const parseTree = this.from.parseTree;
    let lastStatement;
    if (parseTree.body.length === 0) {
      lastStatement = { type: 'EmptyStatement' };
      parseTree.body.push(lastStatement);
    } else {
      lastStatement = parseTree.body[parseTree.body.length - 1];
    }
    lastStatement.trailingComments = lastStatement.trailingComments || [];
    this.parentNode = lastStatement;
    this.commentPropertyName = 'trailingComments';
    this.node = { value: '# sourceURL=', type: 'Line' };
    lastStatement.trailingComments.push(this.node);
    return super.attach(position, adjacentRelation);
  }

  detach() {
    this.node.value = this.node.value.replace(/[@#]\s*sourceURL=([^\s]*)/, '');
    if (/^\s*$/.test(this.node.value)) {
      this.parentNode[this.commentPropertyName].splice(
        this.parentNode[this.commentPropertyName].indexOf(this.node),
        1
      );
    }
    this.node = null;
    this.parentNode = null;
    return super.detach();
  }
}

module.exports = JavaScriptSourceUrl;
