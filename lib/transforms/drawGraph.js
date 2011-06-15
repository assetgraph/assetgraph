var path = require('path'),
    graphviz = require('graphviz');

var relationLabelByType = {
    HtmlScript: '<script>',
    HtmlStyle: '<style>',
    HtmlCacheManifest: '<html manifest>',
    HtmlIFrame: '<iframe>',
    HtmlFrame: '<frame>',
    HtmlAlternateLink: '<link rel=alternate>',
    HtmlConditionalComment: '<!--[if ...]>',
    HtmlImage: '<img>',
    HtmlAudio: '<audio>',
    HtmlVideo: '<video>',
    HtmlVideoPoster: '<video poster>',
    HtmlEmbed: '<embed>',
    HtmlApplet: '<applet>',
    HtmlObject: '<object>',
    HtmlEdgeSideInclude: '<esi:include>',
    HtmlAnchor: '<a>',
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
            g.addEdge(relation.from.id, relation.to.id, {
                fontsize: '9',
                arrowhead: 'empty',
                label: "\"" + (relationLabelByType[relation.type] || '').replace(/\"/g, "\\\"") + "\""
            });
        });
        g.output(path.extname(targetFileName).substr(1), targetFileName);
    }
};
