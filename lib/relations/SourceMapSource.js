var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function SourceMapFile(config) {
    Relation.call(this, config);
}

util.inherits(SourceMapFile, Relation);

extendWithGettersAndSetters(SourceMapFile.prototype, {
    set href(href) {
        this.from.parseTree.sources[this.index] = href;
    },

    get href() {
        return this.from.parseTree.sources[this.index];
    },

    inline: function () {
        Relation.prototype.inline.call(this);
        this.href = "data:" + this.to.contentType + ";base64," + this.to.rawSrc.toString('base64');
    },

    attach: function (asset, position, adjacentRelation) {
        asset.parseTree.sources = asset.parseTree.sources || [];
        this.index = asset.parseTree.sources.length;
        asset.parseTree.sources[this.index] = '<urlGoesHere>';
        return Relation.prototype.attach.call(this, asset, position, adjacentRelation);
    },

    detach: function () {
        this.from.parseTree.sources[this.index] = null; // So that the indices of sibling SourceMapSource relations don't break
        return Relation.prototype.detach.call(this);
    }
});

module.exports = SourceMapFile;
