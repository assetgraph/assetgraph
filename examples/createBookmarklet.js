#!/usr/bin/env node

// Try running ./createBookmarklet.js createBookmarklet/index.js

var AssetGraph = require('../lib/AssetGraph'),
    transforms = AssetGraph.transforms,
    seq = require('seq'),
    commandLineOptions = require('optimist')
        .usage('$0 <javaScriptFile>')
        .demand(1)
        .argv;

new AssetGraph().queue(
    transforms.loadAssets(commandLineOptions._),
    transforms.populate(),
    transforms.minifyAssets()
).run(function (err, assetGraph) {
    if (err) {
        throw err;
    }
    assetGraph.findRelations({type: 'JavaScriptOneInclude'}).forEach(function (relation) {
        assetGraph.detachAndRemoveRelation(relation);
    });

    console.log('javascript:' + assetGraph.collectAssetsPostOrder(assetGraph.findAssets({isInitial: true})[0]).map(function (javaScriptAsset) {
        return assetGraph.getAssetText(javaScriptAsset);
    }).join(';') + ';void(null)');
});
