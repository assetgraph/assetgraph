var graphviz = require('graphviz');

exports.dumpGraph = function dumpGraph(siteGraph, targetFormat, targetFileName, cb) {
    var g = graphviz.digraph("G");
    siteGraph.assets.forEach(function (asset) {
        g.addNode(asset.id.toString(), {
            label: 'url' in asset ? path.basename(asset.url) : 'inline'
        });
    });
    siteGraph.relations.forEach(function (relation) {
        g.addEdge(relation.from.id.toString(), relation.to.id.toString());
    });
    g.output(targetFormat, targetFileName);
    cb();
};
