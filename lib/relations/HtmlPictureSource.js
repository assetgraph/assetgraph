const HtmlRelation = require('./HtmlRelation');

class HtmlPictureSource extends HtmlRelation {
    get href() {
        return this.node.getAttribute('src');
    }

    set href(href) {
        this.node.setAttribute('src', href);
    }

    attach(asset, position, adjacentRelation) {
        // This should probably ensure that the parent element is <picture>, but oh well...
        this.node = asset.parseTree.createElement('source');
        this.attachNodeBeforeOrAfter(position, adjacentRelation);
        return super.attach(asset, position, adjacentRelation);
    }
};

module.exports = HtmlPictureSource;
