const HtmlRelation = require('./HtmlRelation');

class HtmlCacheManifest extends HtmlRelation {
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
