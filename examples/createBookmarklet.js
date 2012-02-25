#!/usr/bin/env node

// Try running ./createBookmarklet.js createBookmarklet/index.js

var AssetGraph = require('../lib/AssetGraph'),
    seq = require('seq'),
    commandLineOptions = require('optimist')
        .usage('$0 <javaScriptFile>')
        .demand(1)
        .argv;

new AssetGraph()
    .loadAssets(commandLineOptions._)
    .populate()
    .minifyAssets()
    .queue(function (assetGraph) {
        var javaScriptsInOrder = assetGraph.collectAssetsPostOrder(assetGraph.findAssets({isInitial: true})[0]);
        assetGraph.findRelations({type: 'JavaScriptOneInclude'}).forEach(function (relation) {
            relation.detach();
        });
        console.log('javascript:' + javaScriptsInOrder.map(function (javaScriptAsset) {
            return javaScriptAsset.text;
        }).join(';') + ';void(null)');
    })
    .run();
