#!/usr/bin/env node

var fs = require('fs'),
    AssetGraph = require('../lib/AssetGraph'),
    urlTools = require('../lib/util/urlTools'),
    transforms = AssetGraph.transforms,
    commandLineOptions = require('optimist')
        .usage("$0 [--root <urlOrDirectory>] [--updatehtml] <inputHtmlFileName>\n\n" +
               "Load one or more HTML files, create cache manifests for them, then write the cache manifests to discs.\n" +
               "If the --updatehtml switch is specified, the HTML files will also be modified to include <html manifest='...'>.")
        .boolean('updatehtml')
        .demand(1)
        .argv;

new AssetGraph({root: commandLineOptions.root}).queue(
    transforms.loadAssets(commandLineOptions._.map(urlTools.fsFilePathToFileUrl)),
    transforms.populate({
        followRelations: {to: {url: /^file:/}, type: AssetGraph.query.not('HtmlAnchor')}
    }),
    transforms.addCacheManifest({type: 'Html'}),
    transforms.writeAssetsToDisc({type: 'CacheManifest', incoming: {from: {type: 'Html', isInitial: true}}}),
    commandLineOptions.updatehtml && transforms.writeAssetsToDisc({type: 'Html', isInitial: true})
).run();
