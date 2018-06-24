const Relation = require('./Relation');

class SystemJsBundle extends Relation {
  inline() {
    throw new Error('SystemJsBundle.inline(): Not supported');
  }

  get href() {
    return this.node.value.match(/[@#]\s*SystemJsBundle=([^\s]*)/)[1];
  }

  set href(href) {
    this.node.value = this.node.value.replace(
      /([@#]\s*SystemJsBundle=)[^\s]*/,
      `$1${href}`
    );
  }

  attach(position, adjacentRelation) {
    if (position !== 'last') {
      throw new Error("Only position === 'last' is supported");
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
    this.node = { value: '# SystemJsBundle=', type: 'Line' };
    lastStatement.trailingComments.push(this.node);
    super.attach(position, adjacentRelation);
  }

  detach() {
    this.node.value = this.node.value.replace(
      /#\s*SystemJsBundle=([^\s]*)/,
      ''
    );
    if (/^\s*$/.test(this.node.value)) {
      this.parentNode[this.commentPropertyName].splice(
        this.parentNode[this.commentPropertyName].indexOf(this.node),
        1
      );
    }
    this.node = null;
    this.parentNode = null;
    super.detach();
  }
}

module.exports = SystemJsBundle;
