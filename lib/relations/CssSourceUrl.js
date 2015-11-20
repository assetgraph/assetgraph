var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function CssSourceUrl(config) {
    Relation.call(this, config);
}

util.inherits(CssSourceUrl, Relation);

extendWithGettersAndSetters(CssSourceUrl.prototype, {
    get href() {
        return this.node.text.match(/[@#]\s*sourceURL=([^\s]*)/)[1];
    },

    set href(href) {
        this.node.text = this.node.text.replace(/([@#]\s*sourceURL=)[^\s]*/, '$1' + href);
    },

    inline: function () {
        throw new Error('CssSourceUrl.inline(): Not supported');
    },

    attach: function (asset, position, adjacentRelation) {
        if (position !== 'last') {
            throw new Error('CssSourceUrl.attach(): Only position === \'last\' is supported');
        }
        var parseTree = asset.parseTree;
        parseTree.append({ type: 'comment', value: '@ sourceURL=' });
        this.node = parseTree.nodes[parseTree.nodes.length - 1];
        return Relation.prototype.attach.call(this, asset, position, adjacentRelation);
    },

    detach: function () {
        this.node.text = this.node.text.replace(/[@#]\s*sourceURL=([^\s]*)/, '');
        this.node = undefined;
        return Relation.prototype.detach.call(this);
    }
});

module.exports = CssSourceUrl;
