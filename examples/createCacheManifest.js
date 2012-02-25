#!/usr/bin/env node

var fs = require('fs'),
    AssetGraph = require('../lib/AssetGraph'),
    urlTools = require('../lib/util/urlTools'),
    commandLineOptions = require('optimist')
        .usage("$0 [--root <urlOrDirectory>] [--updatehtml] <inputHtmlFileName>\n\n" +
               "Load one or more HTML files, create cache manifests for them, then write the cache manifests to discs.\n" +
               "If the --updatehtml switch is specified, the HTML files will also be modified to include <html manifest='...'>.")
        .boolean('updatehtml')
        .demand(1)
        .argv;

new AssetGraph({root: commandLineOptions.root})
    .loadAssets(commandLineOptions._.map(urlTools.fsFilePathToFileUrl))
    .populate({
        followRelations: {to: {url: /^file:/}, type: AssetGraph.query.not('HtmlAnchor')}
    })
    .addCacheManifest({type: 'Html'})
    .writeAssetsToDisc({type: 'CacheManifest', incoming: {from: {type: 'Html', isInitial: true}}})
    .if(commandLineOptions.updatehtml)
        .writeAssetsToDisc({type: 'Html', isInitial: true})
    .endif()
    .run();
