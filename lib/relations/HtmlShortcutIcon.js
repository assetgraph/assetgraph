const HtmlRelation = require('./HtmlRelation');

class HtmlShortcutIcon extends HtmlRelation {
    get href() {
        return this.node.getAttribute('href');
    }

    set href(href) {
        this.node.setAttribute('href', href);
    }

    attach(asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('link');
        this.node.setAttribute('rel', 'shortcut icon'); // Hmm, how to handle apple-touch-icon?
        return super.attach(asset, position, adjacentRelation);
    }
};

module.exports = HtmlShortcutIcon;
