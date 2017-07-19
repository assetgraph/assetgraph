const Relation = require('./Relation');

class SourceMapFile extends Relation {
    set href(href) {
        this.from.parseTree.file = href;
    }

    get href() {
        return this.from.parseTree.file;
    }

    inline() {
        Relation.prototype.inline.call(this);
        this.href = this.to.dataUrl;
        return this;
    }

    attach(asset, position, adjacentRelation) {
        asset.parseTree.file = '<urlGoesHere>';
        return super.attach(asset, position, adjacentRelation);
    }

    detach() {
        this.from.parseTree.file = undefined;
        return super.detach();
    }
};

module.exports = SourceMapFile;
