/*global require, exports*/
var util = require('util'),
    _ = require('underscore'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function ImageSrcSetEntry(config) {
    Relation.call(this, config);
}

util.inherits(ImageSrcSetEntry, Relation);

extendWithGettersAndSetters(ImageSrcSetEntry.prototype, {
    set href(href) {
        this.node.href = href;
    },

    get href() {
        return this.node.href;
    },

    inline: function () {
        Relation.prototype.inline.call(this);
        this.href = "data:" + this.to.contentType + ";base64," + this.to.rawSrc.toString('base64');
    },

    attach: function (asset, position, adjacentRelation) {
        throw new Error("ImageSrcSetEntry.attach(): Not supported");
    },

    detach: function () {
        var fromParseTree = this.from.parseTree,
            indexInFromParseTree = fromParseTree.indexOf(this.node);
        if (indexInFromParseTree !== -1) {
            fromParseTree.splice(indexInFromParseTree, 1);
        }
        return Relation.prototype.detach.call(this);
    }
});

module.exports = ImageSrcSetEntry;
