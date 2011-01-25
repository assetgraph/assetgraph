#!/usr/bin/env node

var URL = require('url'),
    step = require('step'),
    _ = require('underscore'),
    fileUtils = require('./fileUtils'),
    transforms = require('./transforms'),
    SiteGraph = require('./SiteGraph'),
    error = require('./error'),
    commandLineOptions = require('./camelOptimist')({usage: 'FIXME', demand: ['root', 'out-root', 'static-dir']}),
    siteGraph = new SiteGraph({root: commandLineOptions.root}),
    outRoot = fileUtils.fsPathToFileUrl(commandLineOptions.outRoot, true), // forceDirectory
    staticDir = commandLineOptions.staticDir || 'static',
    htmlAssets = [];

step(
    function () {
        commandLineOptions._.forEach(function (htmlUrl) {
            var htmlAsset = siteGraph.registerAsset(htmlUrl);
            htmlAsset.preserveUrl = true;
            htmlAssets.push(htmlAsset);
            transforms.populate(siteGraph, htmlAsset, function (relation) {
                return relation.type !== 'JavaScriptStaticInclude';
            }, this.parallel());
        }, this);
        fileUtils.mkpath(fileUtils.fileUrlToFsPath(outRoot) + staticDir, this.parallel());
    },
    error.logAndExit(function () {
        var numJobs = 0;
        ['HTMLScript', 'HTMLStyle'].forEach(function (relationType) {
            var relationsOfType = siteGraph.relations.filter(function (relation) {
                return relation.from === htmlAssets[0] && relation.type === relationType;
            });
            if (relationsOfType.length > 1) {
                transforms.bundleRelations(siteGraph, relationsOfType, this.parallel());
                numJobs += 1;
            }
        }, this);
        if (numJobs === 0) {
            process.nextTick(this);
        }
    }),
    error.logAndExit(function () {
        transforms.spriteBackgroundImages(siteGraph, this);
    }),
    error.logAndExit(function () {
        transforms.addPNG8FallbackForIE6(siteGraph, this);
    }),
    error.logAndExit(function () {
        transforms.addCacheManifest(siteGraph, htmlAssets[0], this);
    }),
    error.logAndExit(function () {
        transforms.moveAssetsToStaticDir(siteGraph, staticDir, this);
    }),
    error.logAndExit(function () {
        transforms.writeAssetsToDisc(siteGraph, outRoot, this);
    })
);
