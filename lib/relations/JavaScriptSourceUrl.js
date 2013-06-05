var util = require('util'),
    extendWithGettersAndSetters = require('../util/extendWithGettersAndSetters'),
    AssetGraph = require('../AssetGraph'),
    uglifyJs = AssetGraph.JavaScript.uglifyJs,
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
        this.node.value = this.node.value.replace(/([@#]\s*sourceURL=)[^\s]*/, "$1" + href);
    },

    inline: function () {
        throw new Error("JavaScriptSourceUrl.inline(): Not supported");
    },

    attach: function (asset, position, adjacentRelation) {
        if (position !== 'last') {
            throw new Error("JavaScriptSourceUrl.attach(): Only position === 'last' is supported");
        }
        var parseTree = asset.parseTree,
            endToken = parseTree.end;
        if (!endToken) {
            endToken = parseTree.end = new uglifyJs.AST_Token({type: 'eof'});
        }
        // As far as I can tell //# sourceURL isn't widely supported yet, so be conservative:
        this.node = new uglifyJs.AST_Token({type: 'comment1', value: '@ sourceURL='});
        (endToken.comments_before = endToken.comments_before || []).push(this.node);
        return Relation.prototype.attach.call(this, asset, position, adjacentRelation);
    },

    detach: function () {
        this.node.value = this.node.value.replace(/[@#]\s*sourceURL=([^\s]*)/, '');
        this.node = null;
        return Relation.prototype.detach.call(this);
    }
});

module.exports = JavaScriptSourceUrl;
