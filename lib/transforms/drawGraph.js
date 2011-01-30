var path = require('path'),
    graphviz = require('graphviz');

exports.drawGraph = function (targetFileName) {
    return function drawGraph(assetGraph, cb) {
        var g = graphviz.digraph("G"),
            seenNodes = {};

        function registerAssetAsNode(asset, namePrefix) {
            seenNodes[asset.id] = true;
            g.addNode(asset.id.toString(), {
                label: "\"" + (namePrefix || '') + (asset.url ? path.basename(asset.url) : 'i:' + asset.toString()) + "\""
            });
        }
        assetGraph.assets.forEach(function (asset) {
            registerAssetAsNode(asset);
        });
        assetGraph.relations.forEach(function (relation) {
            if (!seenNodes[relation.from.id]) {
                registerAssetAsNode(relation.from, 'o:');
            }
            if (!seenNodes[relation.to.id]) {
                registerAssetAsNode(relation.to, 'o:');
            }
            g.addEdge(relation.from.id.toString(), relation.to.id.toString());
        });
        g.output(path.extname(targetFileName).substr(1), targetFileName);

        process.nextTick(cb);
    }
};
