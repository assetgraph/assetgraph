const Relation = require('./Relation');

class CssSourceMappingUrl extends Relation {
    get href() {
        return this.node.text.match(/[@#]\s*sourceMappingURL=([^\s]*)/)[1];
    }

    set href(href) {
        this.node.text = this.node.text.replace(/([@#]\s*sourceMappingURL=)[^\s]*/, '$1' + href);
    }

    inline() {
        super.inline();
        this.href = this.to.dataUrl;
        this.from.markDirty();
        return this;
    }

    attach(asset, position, adjacentRelation) {
        if (position !== 'last') {
            throw new Error('CssSourceMappingUrl.attach(): Only position === \'last\' is supported');
        }
        const parseTree = asset.parseTree;
        parseTree.append('/*# sourceMappingURL=*/');
        this.node = parseTree.nodes[parseTree.nodes.length - 1];
        return Relation.prototype.attach.call(this, asset, position, adjacentRelation);
    }

    detach() {
        this.node.parent.removeChild(this.node);
        this.node = undefined;
        return Relation.prototype.detach.call(this);
    }
};

module.exports = CssSourceMappingUrl;
