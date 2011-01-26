#!/usr/bin/env node

var SiteGraph = require('./SiteGraph'),
    transforms = require('./transforms'),
    fileUtils = require('./fileUtils'),
    commandLineOptions = require('./camelOptimist')({usage: 'FIXME', demand: ['root', 'out-root', 'static-dir']}),
    siteGraph = new SiteGraph({root: commandLineOptions.root}),
    outRoot = fileUtils.fsPathToFileUrl(commandLineOptions.outRoot, true), // forceDirectory
    staticDir = commandLineOptions.staticDir || 'static',
    htmlAssets = [];

siteGraph.applyTransform(
    function (siteGraph, cb) {
        fileUtils.mkpath(fileUtils.fileUrlToFsPath(outRoot) + staticDir, cb);
    },
    transforms.addInitialAssets(commandLineOptions._),
    transforms.populate(function (relation) {
        return relation.type !== 'JavaScriptStaticInclude';
    }),
    transforms.bundleJavaScriptAndCSS(),
    transforms.spriteBackgroundImages(),
    transforms.addPNG8FallbackForIE6(),
    transforms.addCacheManifestSinglePage(), // Query?
    transforms.minifyAssets(),
    transforms.moveAssetsToStaticDir(staticDir),
    transforms.writeAssetsToDisc(outRoot)
);
