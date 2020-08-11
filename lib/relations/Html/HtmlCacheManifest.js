const HtmlRelation = require('../HtmlRelation');

class HtmlCacheManifest extends HtmlRelation {
  static getRelationsFromNode(node) {
    if (node.nodeType === node.ELEMENT_NODE && node.matches('html[manifest]')) {
      return {
        type: 'HtmlCacheManifest',
        href: node.getAttribute('manifest'),
        node,
      };
    }
  }

  get href() {
    return this.node.getAttribute('manifest') || undefined;
  }

  set href(href) {
    this.node.setAttribute('manifest', href);
  }

  attach(position, adjacentRelation) {
    this.node = this.from.parseTree.documentElement; // Always uses <html manifest='...'>
    return super.attach(position, adjacentRelation);
  }

  detach() {
    this.node.removeAttribute('manifest');
    this.node = undefined;
    return super.detach();
  }
}

HtmlCacheManifest.prototype.targetType = 'CacheManifest';

module.exports = HtmlCacheManifest;
