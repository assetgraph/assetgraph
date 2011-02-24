var path = require('path'),
    graphviz = require('graphviz');

exports.drawGraph = function (targetFileName) {
    return function drawGraph(err, assetGraph, cb) {
        var g = graphviz.digraph("G"),
            seenNodes = {};

        function addAssetAsNode(asset, namePrefix) {
            seenNodes[asset.id] = true;
            g.addNode(asset.id.toString(), {
                label: "\"" + (namePrefix || '') + (asset.url ? path.basename(asset.url) : 'i:' + asset.toString()) + "\""
            });
        }
        assetGraph.assets.forEach(function (asset) {
            addAssetAsNode(asset);
        });
        assetGraph.relations.forEach(function (relation) {
            if (!seenNodes[relation.from.id]) {
                addAssetAsNode(relation.from, 'o:');
            }
            if (!seenNodes[relation.to.id]) {
                addAssetAsNode(relation.to, 'o:');
            }
            g.addEdge(relation.from.id.toString(), relation.to.id.toString());
        });
        g.output(path.extname(targetFileName).substr(1), targetFileName);

        process.nextTick(cb);
    }
};
