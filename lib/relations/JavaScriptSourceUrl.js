var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function JavaScriptSourceUrl(config) {
    Relation.call(this, config);
}

util.inherits(JavaScriptSourceUrl, Relation);

extendWithGettersAndSetters(JavaScriptSourceUrl.prototype, {
    get href() {
        return this.node.value.match(/[@#]\s*sourceURL=([^\s]*)/)[1];
    },

    set href(href) {
        this.node.value = this.node.value.replace(/([@#]\s*sourceURL=)[^\s]*/, '$1' + href);
    },

    inline: function () {
        throw new Error('JavaScriptSourceUrl.inline(): Not supported');
    },

    attach: function (asset, position, adjacentRelation) {
        if (position !== 'last') {
            throw new Error('JavaScriptSourceUrl.attach(): Only position === \'last\' is supported');
        }
        var parseTree = asset.parseTree;
        var lastStatement;
        if (parseTree.body.length === 0) {
            lastStatement = { type: 'EmptyStatement' };
            parseTree.body.push(lastStatement);
        } else {
            lastStatement = parseTree.body[parseTree.body.length - 1];
        }
        lastStatement.trailingComments = lastStatement.trailingComments || [];
        this.node = { value: '@ sourceURL=', type: 'Line' };
        lastStatement.trailingComments.push(this.node);
        return Relation.prototype.attach.call(this, asset, position, adjacentRelation);
    },

    detach: function () {
        this.node.value = this.node.value.replace(/[@#]\s*sourceURL=([^\s]*)/, '');
        this.node = null;
        return Relation.prototype.detach.call(this);
    }
});

module.exports = JavaScriptSourceUrl;
