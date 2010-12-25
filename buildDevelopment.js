#!/usr/bin/env node

var util = require('util'),
    path = require('path'),
    fs = require('fs'),
    step = require('step'),
    _ = require('underscore'),
    relations = require('./relations'),
    assets = require('./assets'),
    resolvers = require('./resolvers'),
    SiteGraph = require('./SiteGraph'),
    FsLoader = require('./FsLoader'),
    error = require('./error'),
    options = {};

_.each(require('optimist').usage('FIXME')/*.demand(['assets-root'])*/.argv,
    function (value, optionName) {
        options[optionName.replace(/-([a-z])/g, function ($0, $1) {
            return $1.toUpperCase();
        })] = value;
    }
);

var siteGraph = new SiteGraph(),
    loader = new FsLoader({
        siteGraph: siteGraph,
        root: options.assetsRoot
    });

step(
    function () {
        var group = this.group();
        (options.label || []).forEach(function (labelDefinition) {
            var keyValue = labelDefinition.split('=');
            if (keyValue.length != 2) {
                throw "Invalid label syntax: " + labelDefinition;
            }
            var labelName = keyValue[0],
                labelValue = keyValue[1],
                callback = group(),
                matchSenchaJSBuilder = labelValue.match(/\.jsb(\d)$/);
            if (matchSenchaJSBuilder) {
                var baseUrl = path.dirname(labelValue),
                    version = parseInt(matchSenchaJSBuilder[1], 10);
                fs.readFile(path.join(loader.root, labelValue), 'utf8', error.throwException(function (fileBody) {
                    loader.addLabelResolver(labelName, resolvers.SenchaJSBuilder, {
                        baseUrl: baseUrl || '',
                        version: version,
                        body: JSON.parse(fileBody)
                    });
                    callback();
                }));
            } else {
                path.exists(path.join(loader.root, labelValue), function (exists) {
                    if (!exists) {
                        throw new Error("Label " + labelName + ": Dir not found: " + labelValue);
                    }
                    loader.addLabelResolver(labelName, resolvers.Directory, {baseUrl: labelValue});
                    callback();
                });
            }
        });
        process.nextTick(group());
    },
    function () {
        var group = this.group();
        (options._ || []).forEach(function (templateUrl) {
            var asset = loader.loadAsset({type: 'HTML', url: templateUrl});
            loader.populate(asset, ['html-script-tag', 'js-static-include'], group());
        });
    }
);
