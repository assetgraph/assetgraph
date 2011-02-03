var jsdom = require('jsdom'),
    uglify = require('uglify-js'),
    Script = process.binding('evals').Script;

exports.executeJavaScript = function (options) {
    if (!options.environment) {
        throw new Error("transforms.executeJavaScript: no 'environment' option provided");
    }
    return function executeJavaScript(assetGraph, cb) {
        assetGraph.findAssets('isInitial', true).forEach(function (initialAsset) {
            var subGraph = assetGraph.lookupSubgraph(initialAsset, function (relation) {
                return relation.type === 'HTMLScript' || relation.type === 'JavaScriptStaticInclude' ||
                    (relation.type === 'JavaScriptIfEnvironment' && relation.environment === options.environment);
                });
            subGraph.findRelations('type', 'JavaScriptIfEnvironment').forEach(function (relation) {
                var window = jsdom.createWindow();
                window.document = htmlAsset.parseTree;
                Script.runInNewContext(uglify.uglify.gen_code(relation.to.parseTree), window);
            });
        });

        process.nextTick(cb);
    };
};
