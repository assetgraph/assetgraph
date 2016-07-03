var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function SrcSetEntry(config) {
    Relation.call(this, config);
}

util.inherits(SrcSetEntry, Relation);

extendWithGettersAndSetters(SrcSetEntry.prototype, {
    set href(href) {
        this.node.href = href;
    },

    get href() {
        return this.node.href;
    },

    inline: function () {
        Relation.prototype.inline.call(this);
        this.href = this.to.dataUrl;
    },

    attach: function () {
        throw new Error('SrcSetEntry.attach(): Not supported');
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

module.exports = SrcSetEntry;
