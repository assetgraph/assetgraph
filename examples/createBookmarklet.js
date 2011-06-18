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
    var initialJavaScript = assetGraph.findAssets({isInitial: true})[0],
        javaScriptAssetsInOrder = assetGraph.collectAssetsPostOrder(initialJavaScript);
    assetGraph.findRelations({type: 'JavaScriptOneInclude'}).forEach(function (relation) {
        assetGraph.detachAndRemoveRelation(relation);
    });

    seq(javaScriptAssetsInOrder)
        .parMap(function (javaScriptAsset) {
            assetGraph.getAssetText(javaScriptAsset, this);
        })
        .unflatten()
        .seq(function (texts) {
            console.log('javascript:' + texts.join(';') + ';void(null);');
        });
    }
);
