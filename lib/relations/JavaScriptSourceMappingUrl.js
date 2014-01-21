var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    AssetGraph = require('../'),
    uglifyJs = AssetGraph.JavaScript.uglifyJs,
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
            throw new Error('JavaScriptSourceMappingUrl.attach(): Only position === "last" is supported');
        }
        var parseTree = asset.parseTree,
            endToken = parseTree.end;
        if (!endToken) {
            endToken = parseTree.end = new uglifyJs.AST_Token({type: 'eof'});
        }
        // As far as I can tell //# sourceMappingURL isn't widely supported yet, so be conservative:
        this.node = new uglifyJs.AST_Token({type: 'comment1', value: '@ sourceMappingURL='});
        (endToken.comments_before = endToken.comments_before || []).push(this.node);
        return Relation.prototype.attach.call(this, asset, position, adjacentRelation);
    },

    detach: function () {
        this.node.value = this.node.value.replace(/[@#]\s*sourceMappingURL=([^\s]*)/, '');
        this.node = null;
        return Relation.prototype.detach.call(this);
    }
});

module.exports = JavaScriptSourceMappingUrl;
