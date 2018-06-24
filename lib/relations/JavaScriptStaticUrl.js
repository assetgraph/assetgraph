const replaceDescendantNode = require('../replaceDescendantNode');
const Relation = require('./Relation');

class JavaScriptStaticUrl extends Relation {
  get href() {
    return this.argumentNode.value;
  }

  set href(href) {
    if (
      this.from &&
      this.from.assetGraph &&
      /^file:/.test(this.from.assetGraph.root) &&
      href.startsWith(this.from.assetGraph.root)
    ) {
      // Hack: Force a root-relative url instead of an absolute file url
      // when eg. pointing back into the root from eg. a CDN and we
      // don't know the canonical root:
      href = `/${href.substr(this.from.assetGraph.root.length)}`;
    }
    this.argumentNode.value = href;
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
