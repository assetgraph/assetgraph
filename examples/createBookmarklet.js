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
    .once('complete', function (assetGraph) {
        assetGraph.findRelations({type: 'JavaScriptOneInclude'}).forEach(function (relation) {
            relation.detach();
        });
        console.log('javascript:' + assetGraph.collectAssetsPostOrder(assetGraph.findAssets({isInitial: true})[0]).map(function (javaScriptAsset) {
            return javaScriptAsset.text;
        }).join(';') + ';void(null)');
    });
