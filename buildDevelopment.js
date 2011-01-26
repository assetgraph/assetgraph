#!/usr/bin/env node

var util = require('util'),
    path = require('path'),
    fs = require('fs'),
    step = require('step'),
    _ = require('underscore'),
    fileUtils = require('./fileUtils'),
    transforms = require('./transforms'),
    SiteGraph = require('./SiteGraph'),
    error = require('./error'),
    commandLineOptions = require('./camelOptimist')({usage: 'FIXME', demand: ['root']}),
    siteGraph = new SiteGraph({root: commandLineOptions.root + '/'}),
    templates = [];

siteGraph.applyTransforms(
    transforms.registerLabelsAsCustomProtocols(commandLineOptions.label || []),
    transforms.populate({
        initial: commandLineOptions._,
        includeRelations: function (relation) {
            return ['HTMLScript', 'JavaScriptStaticInclude', 'JavaScriptIfEnvironment',
                    'HTMLStyle', 'CSSBackgroundImage'].indexOf(relation.type) !== -1;
            }
        }
    ),
    transforms.flattenStaticIncludes(),
    transforms.executeJavaScript({environment: 'buildDevelopment'}),
    transforms.inlineDirtyAssets(),
    function (siteGraph) {
        templates.forEach(function (template) {
            var callback = this.parallel();
            template.serialize(error.throwException(function (src) {
                fs.writeFile(fileUtils.fileUrlToFsPath(template.url).replace(/\.template$/, ''), src, 'utf8', callback);
            }));
        }, this);
    }
);

step(
    function () {
        transforms.registerLabelsAsCustomProtocols(siteGraph, commandLineOptions.label || [], this);
    },
    error.logAndExit(function () {
        transforms.executeJavaScriptIfEnvironment(siteGraph, templates[0], 'buildDevelopment', this);
    }),
    error.logAndExit(function inlineDirtyAssets() {
        var numCallbacks = 0;
        siteGraph.assets.filter(function (asset) {return asset.isDirty;}).forEach(function (dirtyAsset) {
            siteGraph.findRelations('to', dirtyAsset).forEach(function (relation) {
                numCallbacks += 1;
                siteGraph.inlineRelation(relation, this.parallel());
            }, this);
            dirtyAsset.isDirty = false;
        }, this);
        if (!numCallbacks) {
            process.nextTick(this);
        }
    }),
    error.logAndExit(function () {
        templates.forEach(function (template) {
            var callback = this.parallel();
            template.serialize(error.throwException(function (src) {
                fs.writeFile(fileUtils.fileUrlToFsPath(template.url).replace(/\.template$/, ''), src, 'utf8', callback);
            }));
        }, this);
    })
);
