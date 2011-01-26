#!/usr/bin/env node

var SiteGraph = require('../lib/SiteGraph'),
    transforms = require('../lib/transforms'),
    commandLineOptions = require('../lib/camelOptimist')({usage: 'FIXME', demand: ['root']});

new SiteGraph({root: commandLineOptions.root + '/'}).applyTransform(
    transforms.addInitialAssets(commandLineOptions._),
    transforms.registerLabelsAsCustomProtocols(commandLineOptions.label || []),
    transforms.populate(function (relation) {
        return ['HTMLScript', 'JavaScriptStaticInclude', 'JavaScriptIfEnvironment', 'HTMLStyle', 'CSSBackgroundImage'].indexOf(relation.type) !== -1;
    }),
    transforms.flattenStaticIncludes(),
    transforms.executeJavaScript({environment: 'buildDevelopment'}),
    transforms.inlineDirtyAssets(),
    transforms.writeInitialAssetsBackToDisc()
);
