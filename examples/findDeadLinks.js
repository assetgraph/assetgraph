#!/usr/bin/env node

var AssetGraph = require('../lib/AssetGraph');

AssetGraph({root: './'})
    .loadAssets('*.html')
    .populate({
        followRelations: {to: {url: /^file:/}},
        onError: function (err, assetGraph, asset) {
            console.error(asset.url + ': ' + err.message);
            process.exit(1);
        }
    })
    .run();
