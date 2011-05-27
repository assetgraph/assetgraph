var path = require('path'),
    graphviz = require('graphviz');

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
            g.addEdge(relation.from.id, relation.to.id);
        });
        g.output(path.extname(targetFileName).substr(1), targetFileName);
    }
};
