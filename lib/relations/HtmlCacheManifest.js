const HtmlRelation = require('./HtmlRelation');

class HtmlCacheManifest extends HtmlRelation {
    get href() {
        return this.node.getAttribute('manifest') || undefined;
    }

    set href(href) {
        this.node.setAttribute('manifest', href);
    }

    attach(asset, position, adjacentRelation) {
        this.node = asset.parseTree.documentElement; // Always uses <html manifest='...'>
        return super.attach(asset, position, adjacentRelation);
    }

    detach() {
        this.node.removeAttribute('manifest');
        this.node = undefined;
        return super.detach();
    }
};

module.exports = HtmlCacheManifest;
