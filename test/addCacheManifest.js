var step = require('step'),
    SiteGraph = require('../SiteGraph'),
    FsLoader = require('../loaders/Fs'),
    assets = require('../assets'),
    transforms = require('../transforms'),
    error = require('../error');

var siteGraph = new SiteGraph(),
    loader = new FsLoader({
        siteGraph: siteGraph,
        root: 'addCacheManifest'
    });

var html = loader.loadAsset({type: 'HTML', url: 'index.html'});
loader.populate(html, function () {return true;}, function () {
    step(
        function () {
            transforms.dumpGraph(siteGraph, 'svg', 'beforemanifest.svg', this);
        },
        error.logAndExit(function () {
            console.log("ASSETS:\n\n" + siteGraph.assets.join("\n  "));
            console.log("RELATIONS:\n\n" + siteGraph.relations.join("\n  "));
            console.log("\n");
            process.nextTick(this);
        }),
        error.logAndExit(function () {
            transforms.addCacheManifest(siteGraph, html, this);
        }),
        error.logAndExit(function () {
            transforms.dumpGraph(siteGraph, 'svg', 'aftermanifest.svg', this);
        }),
        error.logAndExit(function () {
            console.log("ASSETS:\n\n  " + siteGraph.assets.join("\n  "));
            console.log("RELATIONS:\n\n  " + siteGraph.relations.join("\n  "));
            console.log("\n");
            process.nextTick(this);
        }),
        error.logAndExit(function () {
            transforms.checkRelationConsistency(siteGraph, this);
        })
    );
});
