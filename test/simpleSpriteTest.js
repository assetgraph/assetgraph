var step = require('step'),
    SiteGraph = require('../SiteGraph'),
    assets = require('../assets'),
    transforms = require('../transforms'),
    error = require('../error'),
    siteGraph = new SiteGraph({root: 'simpleSpriteTest'}),
    stylesheet = siteGraph.loadAsset({type: 'CSS', url: 'style.css'});

siteGraph.populate(stylesheet, function () {return true;}, function () {
    step(
        function () {
            transforms.dumpGraph(siteGraph, 'svg', 'beforesprite.svg', this);
        },
        error.logAndExit(function () {
            console.log("ASSETS:\n\n" + siteGraph.assets.join("\n  "));
            console.log("RELATIONS:\n\n" + siteGraph.relations.join("\n  "));
            console.log("\n");
            process.nextTick(this);
        }),
        error.logAndExit(function () {
            transforms.spriteBackgroundImages(siteGraph, this);
        }),
        error.logAndExit(function () {
            transforms.dumpGraph(siteGraph, 'svg', 'aftersprite.svg', this);
        }),
        error.logAndExit(function () {
            console.log("ASSETS:\n\n  " + siteGraph.assets.join("\n  "));
            console.log("RELATIONS:\n\n  " + siteGraph.relations.join("\n  "));
            console.log("\n");
            process.nextTick(this);
        }),
        error.logAndExit(function () {
            transforms.checkRelationConsistency(siteGraph, this);
        }),
        error.logAndExit(function () {
            stylesheet.serialize(function (err, src) {
                console.log(src);
            });
        })
    );
});
