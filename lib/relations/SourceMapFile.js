var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function SourceMapFile(config) {
    Relation.call(this, config);
}

util.inherits(SourceMapFile, Relation);

extendWithGettersAndSetters(SourceMapFile.prototype, {
    set href(href) {
        this.from.parseTree.file = href;
    },

    get href() {
        return this.from.parseTree.file;
    },

    inline: function () {
        Relation.prototype.inline.call(this);
        this.href = this.to.dataUrl;
    },

    attach: function (asset, position, adjacentRelation) {
        asset.parseTree.file = '<urlGoesHere>';
        return Relation.prototype.attach.call(this, asset, position, adjacentRelation);
    },

    detach: function () {
        this.from.parseTree.file = undefined;
        return Relation.prototype.detach.call(this);
    }
});

module.exports = SourceMapFile;
