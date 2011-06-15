#!/usr/bin/env node

var AssetGraph = require('../lib/AssetGraph'),
    transforms = AssetGraph.transforms;

AssetGraph({root: './'}).queue(
    transforms.loadAssets('*.html'),
    transforms.populate({
        followRelations: {to: {url: /^file:/}},
        onError: function (err, assetGraph, asset) {
            console.error(asset.url + ': ' + err.message);
            process.exit(1);
        }
    })
).run();
