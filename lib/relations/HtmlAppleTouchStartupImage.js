const HtmlRelation = require('./HtmlRelation');

class HtmlAppleTouchStartupImage extends HtmlRelation {
    get href() {
        return this.node.getAttribute('href');
    }

    set href(href) {
        this.node.setAttribute('href', href);
    }

    attach(asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('link');
        this.node.setAttribute('rel', 'apple-touch-startup-image');
        return super.attach(asset, position, adjacentRelation);
    }
};

module.exports = HtmlAppleTouchStartupImage;
