#!/usr/bin/env node

var util = require('util'),
    path = require('path'),
    fs = require('fs'),
    step = require('step'),
    _ = require('underscore'),
    fileUtils = require('./fileUtils'),
    assets = require('./assets'),
    relations = require('./relations'),
    transforms = require('./transforms'),
    SiteGraph = require('./SiteGraph'),
    FsLoader = require('./loaders/Fs'),
    error = require('./error'),
    options = {};

_.each(require('optimist').usage('FIXME').demand(['root']).argv,
    function (value, optionName) {
        options[optionName.replace(/-([a-z])/g, function ($0, $1) {
            return $1.toUpperCase();
        })] = value;
    }
);

var siteGraph = new SiteGraph(),
    loader = new FsLoader({
        siteGraph: siteGraph,
        root: options.root
    }),
    templates = [];

step(
    function () {
        transforms.addLabelResolversToFsLoader(loader, options.label || [], this);
    },
    error.logAndExit(function () {
        var group = this.group();
        options._.forEach(function (templateUrl) {
            var template = loader.loadAsset({type: 'HTML', url: templateUrl});
            templates.push(template);
            loader.populate(template, function (relation) {
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
            } else if (relation.to.url) {
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
                fs.writeFile(path.join(loader.root, template.url.replace(/\.template$/, '')), src, 'utf8', callback);
            }));
        }, this);
    })
);
