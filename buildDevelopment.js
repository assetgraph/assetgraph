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
    siteGraph = new SiteGraph({root: commandLineOptions.root}),
    templates = [];

step(
    function () {
        transforms.addFsLabelResolvers(siteGraph, commandLineOptions.label || [], this);
    },
    error.logAndExit(function () {
        var group = this.group();
        commandLineOptions._.forEach(function (templateUrl) {
            var template = siteGraph.loadAsset({type: 'HTML', url: templateUrl});
            templates.push(template);
            siteGraph.populate(template, function (relation) {
                return ['HTMLScript', 'JavaScriptStaticInclude', 'HTMLStyle', 'CSSBackgroundImage'].indexOf(relation.type) !== -1;
            }, group());
        });
    }),
    error.logAndExit(function () {
        templates.forEach(function (template) {
            transforms.flattenStaticIncludes(siteGraph, template, this.parallel());
        }, this);
    }),
    error.logAndExit(function inlineDirtyAssets() {
        var numCallbacks = 0;
        siteGraph.relations.forEach(function (relation) {
            if (relation.to.dirty) {
                numCallbacks += 1;
                siteGraph.inlineRelation(relation, this.parallel());
            } else if (!relation.isInline && relation.to.url) {
                relation.setUrl(relation.to.url);
            }
        }, this);
        if (!numCallbacks) {
            process.nextTick(this);
        }
    }),
    error.logAndExit(function () {
        templates.forEach(function (template) {
            var callback = this.parallel();
            template.serialize(error.throwException(function (src) {
                fs.writeFile(path.join(siteGraph.fsLoader.root, template.url.replace(/\.template$/, '')), src, 'utf8', callback);
            }));
        }, this);
    })
);
