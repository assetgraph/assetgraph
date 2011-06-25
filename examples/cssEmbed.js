#!/usr/bin/env node

// Clone of http://www.nczonline.net/blog/2009/11/03/automatic-data-uri-embedding-in-css-files/

var AssetGraph = require('../lib/AssetGraph'),
    passError = require('../lib/util/passError'),
    transforms = AssetGraph.transforms,
    fs = require('fs'),
    commandLineOptions = require('optimist')
        .usage('$0 [--root <urlOrDirectory>] [-o <outputCssFileName>] <inputCssFileName>')
        .demand(1)
        .argv;

new AssetGraph({root: commandLineOptions.root}).queue(
    transforms.loadAssets(commandLineOptions._),
    transforms.populate({
        followRelations: {type: 'CssImage'}
    }),
    transforms.inlineRelations({type: 'CssImage'}),
    function(assetGraph, cb) {
        var initialCssAsset = assetGraph.findAssets({isInitial: true})[0];
        assetGraph.getSerializedAsset(initialCssAsset, passError(cb, function (src) {
            if (commandLineOptions.o) {
                fs.writeFile(commandLineOptions.o, src, null, cb);
            } else {
                process.stdout.write(src);
                cb();
            }
        }));
    }
).run();
