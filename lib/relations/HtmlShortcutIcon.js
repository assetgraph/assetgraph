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
        if (position) {
            this.attachNodeBeforeOrAfter(position, adjacentRelation);
        } else {
            // TODO: Consider moving this to HtmlRelation.prototype.attachNodeBeforeOrAfter
            let head = asset.parseTree.getElementsByTagName('head')[0];
            if (!head) {
                head = asset.parseTree.createElement('head');

                if (asset.parseTree.documentElement) {
                    asset.parseTree.documentElement.insertBefore(head, asset.parseTree.documentElement.firstChild);
                } else {
                    const err = new Error('Unable to add HtmlShortcutIcon relation to HTML document');
                    err.asset = asset;

                    asset.assetGraph.warn(err);
                    return null;
                }
            }
            head.appendChild(this.node);
        }
        return super.attach(asset, position, adjacentRelation);
    }
};

module.exports = HtmlShortcutIcon;
