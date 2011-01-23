var jsdom = require('jsdom'),
    uglify = require('uglify'),
    Script = process.binding('evals').Script;

exports.executeJavaScriptIfEnvironment = function executeJavaScriptIfEnvironment(siteGraph, htmlAsset, environment, cb) {
    var subGraph = siteGraph.lookupSubgraph(htmlAsset, function (relation) {
        return relation.type === 'HTMLScript' || relation.type === 'JavaScriptStaticInclude' ||
            (relation.type === 'JavaScriptIfEnvironment' && relation.environment === environment);
    });
    subGraph.findRelations('type', 'JavaScriptIfEnvironment').forEach(function (relation) {
        var window = jsdom.createWindow();
        window.document = htmlAsset.parseTree;
        console.log(uglify.uglify.gen_code(relation.to.parseTree));
        Script.runInNewContext(uglify.uglify.gen_code(relation.to.parseTree), window);
    });
    process.nextTick(function () {
        cb(null, siteGraph);
    });
};
