var path = require('path'),
    graphviz;

try {
    graphviz = require('graphviz');
} catch (e) {
    throw new Error('transforms.drawGraph: The "graphviz" module is required. Please run "npm install graphviz" and try again (tested with version 0.0.5).');
}

var relationLabelByType = {
    HtmlScript: '<script>',
    HtmlStyle: '<style>',
    HtmlCacheManifest: '<html manifest>',
    HtmlIFrame: '<iframe>',
    HtmlFrame: '<frame>',
    HtmlAlternateLink: '<link rel=alternate>',
    HtmlConditionalComment: function (htmlConditionalComment) {return '<!--[if ' + htmlConditionalComment.condition + ']>';},
    HtmlImage: '<img>',
    HtmlAudio: '<audio>',
    HtmlShortcutIcon: 'icon',
    HtmlVideo: '<video>',
    HtmlVideoPoster: '<video poster>',
    HtmlEmbed: '<embed>',
    HtmlApplet: '<applet>',
    HtmlObject: '<object>',
    HtmlEdgeSideInclude: '<esi:include>',
    HtmlAnchor: '<a>',
    HtmlRequireJsMain: 'data-main',
    JavaScriptOneInclude: 'one.include',
    JavaScriptOneGetText: 'one.getText',
    JavaScriptOneGetStaticUrl: 'one.getStaticUrl',
    JavaScriptAmdDefine: 'define',
    JavaScriptAmdRequire: 'require',
    CssImage: 'background-image',
    CssImport: '@import',
    CssBehavior: 'behavior'
};

module.exports = function (targetFileName) {
    return function drawGraph(assetGraph) {
        var g = graphviz.digraph("G"),
            seenNodes = {};

        function addAssetAsNode(asset, namePrefix) {
            seenNodes[asset.id] = true;
            g.addNode(asset.id, {
                label: "\"" + (namePrefix || '') + (asset.url ? path.basename(asset.url) : 'i:' + asset) + "\""
            });
        }
        assetGraph.findAssets().forEach(function (asset) {
            addAssetAsNode(asset);
        });
        assetGraph.findRelations().forEach(function (relation) {
            if (!seenNodes[relation.from.id]) {
                addAssetAsNode(relation.from, 'o:');
            }
            if (!seenNodes[relation.to.id]) {
                addAssetAsNode(relation.to, 'o:');
            }
            var label = relationLabelByType[relation.type] || '';
            if (typeof label === 'function') {
                label = label(relation);
            }
            g.addEdge(relation.from.id, relation.to.id, {
                fontsize: '9',
                arrowhead: 'empty',
                label: "\"" + label.replace(/\"/g, "\\\"") + "\""
            });
        });
        g.output(path.extname(targetFileName).substr(1), targetFileName);
    };
};
