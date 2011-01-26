#!/usr/bin/env node

var fs = require('fs'),
    step = require('step'),
    _ = require('underscore'),
    fileUtils = require('./fileUtils'),
    transforms = require('./transforms'),
    SiteGraph = require('./SiteGraph'),
    error = require('./error'),
    commandLineOptions = require('./camelOptimist')({usage: 'FIXME', demand: ['root']}),
    siteGraph = new SiteGraph({root: commandLineOptions.root + '/'});

siteGraph.applyTransforms(
    transforms.addInitialAssets(commandLineOptions._),
    transforms.registerLabelsAsCustomProtocols(commandLineOptions.label || []),
    transforms.populate({
        includeRelationsLambda: function (relation) {
            return ['HTMLScript', 'JavaScriptStaticInclude', 'JavaScriptIfEnvironment', 'HTMLStyle', 'CSSBackgroundImage'].indexOf(relation.type) !== -1;
        }
    }),
    transforms.flattenStaticIncludes(),
    transforms.executeJavaScript({environment: 'buildDevelopment'}),
    transforms.inlineDirtyAssets(),
    function (siteGraph, cb) {
        step(
            function () {
                siteGraph.findAssets('isInitial', true).forEach(function (asset) {
if (asset.type !== 'HTML') return;
                    var callback = this.parallel();
                    asset.serialize(error.throwException(function (src) {
                        fs.writeFile(fileUtils.fileUrlToFsPath(asset.url).replace(/\.template$/, ''), src, asset.encoding, callback);
                    }));
                }, this);
            },
            function () {
                cb(null, siteGraph);
            }
        );
    }
);
