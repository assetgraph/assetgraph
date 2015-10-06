var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    Relation = require('./Relation');

function JavaScriptSourceMappingUrl(config) {
    Relation.call(this, config);
}

util.inherits(JavaScriptSourceMappingUrl, Relation);

extendWithGettersAndSetters(JavaScriptSourceMappingUrl.prototype, {
    get href() {
        return this.node.value.match(/[@#]\s*sourceMappingURL=([^\s]*)/)[1];
    },

    set href(href) {
        this.node.value = this.node.value.replace(/([@#]\s*sourceMappingURL=)[^\s]*/, '$1' + href);
    },

    inline: function () {
        throw new Error('JavaScriptSourceMappingUrl.inline(): Not supported');
    },

    attach: function (asset, position, adjacentRelation) {
        if (position !== 'last') {
            throw new Error('JavaScriptSourceMappingUrl.attach(): Only position === \'last\' is supported');
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
        this.node = { value: '@ sourceMappingURL=', type: 'Line' };
        lastStatement.trailingComments.push(this.node);
        // As far as I can tell //# sourceMappingURL isn't widely supported yet, so be conservative:
        return Relation.prototype.attach.call(this, asset, position, adjacentRelation);
    },

    detach: function () {
        this.node.value = this.node.value.replace(/[@#]\s*sourceMappingURL=([^\s]*)/, '');
        this.node = null;
        return Relation.prototype.detach.call(this);
    }
});

module.exports = JavaScriptSourceMappingUrl;
