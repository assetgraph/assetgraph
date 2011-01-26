#!/usr/bin/env node

var SiteGraph = require('./SiteGraph'),
    transforms = require('./transforms'),
    commandLineOptions = require('./camelOptimist')({usage: 'FIXME', demand: ['root']});

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
