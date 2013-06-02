var _ = require('underscore'),
    AssetGraph = require('../AssetGraph'),
    uglifyJs = AssetGraph.JavaScript.uglifyJs;

module.exports = function (queryObj) {
    return function (assetGraph) {
        assetGraph.findAssets(_.extend({type: 'JavaScript'}, queryObj)).forEach(function (javaScript) {
            var parseTree = javaScript.parseTree,
                endToken = parseTree.end;
            if (!endToken) {
                endToken = parseTree.end = new uglifyJs.AST_Token({type: 'eof'});
            }
            var comment = new uglifyJs.AST_Token({type: 'comment1', value: '@ sourceURL='});
            (endToken.comments_before = endToken.comments_before || []).push(comment);
            var javaScriptSourceUrl = new AssetGraph.JavaScriptSourceUrl({
                from: javaScript,
                node: comment,
                to: javaScript
            });
            javaScript.markDirty();
            assetGraph.addRelation(javaScriptSourceUrl, 'last');
            javaScriptSourceUrl.refreshHref();
        });
    };
};
