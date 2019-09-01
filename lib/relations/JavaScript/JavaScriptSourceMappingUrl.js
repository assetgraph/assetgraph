const Relation = require('../Relation');

class JavaScriptSourceMappingUrl extends Relation {
  static get selectors() {
    return {
      ':matches([leadingComments], [trailingComments])'(node, stack) {
        for (const propertyName of ['leadingComments', 'trailingComments']) {
          for (const comment of node[propertyName] || []) {
            const matchSourceMappingUrl = comment.value.match(
              /[@#]\s*sourceMappingURL=([^\s\n]*)/
            );
            if (matchSourceMappingUrl) {
              return {
                type: 'JavaScriptSourceMappingUrl',
                node: comment,
                parentNode: node,
                commentPropertyName: propertyName,
                to: {
                  url: matchSourceMappingUrl[1],
                  // Source maps are currently served as application/json, so prevent the target asset
                  // from being loaded as a Json asset:
                  type: 'SourceMap'
                }
              };
            }
          }
        }
      }
    };
  }

  get href() {
    return this.node.value.match(/[@#]\s*sourceMappingURL=([^\s]*)/)[1];
  }

  set href(href) {
    this.node.value = this.node.value.replace(
      /([@#]\s*sourceMappingURL=)[^\s]*/,
      `$1${href}`
    );
  }

  inline() {
    super.inline();
    this.href = this.to.dataUrl + (this.fragment || '');
    this.from.markDirty();
    return this;
  }

  attach(position, adjacentRelation) {
    if (position !== 'last') {
      throw new Error(
        "JavaScriptSourceMappingUrl.attach(): Only position === 'last' is supported"
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
    this.node = { value: '# sourceMappingURL=', type: 'Line' };
    lastStatement.trailingComments.push(this.node);
    this.refreshHref();
    // As far as I can tell //# sourceMappingURL isn't widely supported yet, so be conservative:
    return super.attach(position, adjacentRelation);
  }

  detach() {
    this.node.value = this.node.value.replace(
      /[@#]\s*sourceMappingURL=([^\s]*)/,
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
    return super.detach();
  }
}

JavaScriptSourceMappingUrl.prototype.targetType = 'SourceMap';

module.exports = JavaScriptSourceMappingUrl;
