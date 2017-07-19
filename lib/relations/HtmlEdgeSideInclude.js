const HtmlRelation = require('./HtmlRelation');

class HtmlEdgeSideInclude extends HtmlRelation {
    get href() {
        return this.node.getAttribute('src');
    }

    set href(href) {
        this.node.setAttribute('src', href);
    }

    inline() {
        throw new Error('HtmlEdgeSideInclude.inline(): Not implemented yet.');
    }

    attach(asset, position, adjacentRelation) {
        this.node = asset.parseTree.createElement('esi:include');
        this.attachNodeBeforeOrAfter(this.node, position, adjacentRelation);
        return super.attach(asset, position, adjacentRelation);
    }
};

module.exports = HtmlEdgeSideInclude;
