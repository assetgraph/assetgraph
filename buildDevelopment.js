#!/usr/bin/env node

var util = require('util'),
    path = require('path'),
    fs = require('fs'),
    step = require('step'),
    _ = require('underscore'),
    fileUtils = require('./fileUtils'),
    assets = require('./assets'),
    relations = require('./relations'),
    resolvers = require('./loaders/Fs/resolvers'),
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
                var url = fileUtils.dirnameNoDot(labelValue) || '',
                    version = parseInt(matchSenchaJSBuilder[1], 10);
                fs.readFile(path.join(loader.root, labelValue), 'utf8', error.logAndExit(function (fileBody) {
                    loader.addLabelResolver(labelName, resolvers.SenchaJSBuilder, {
                        url: url,
                        version: version,
                        body: JSON.parse(fileBody)
                    });
                    callback();
                }));
            } else {
                path.exists(path.join(loader.root, labelValue), function (exists) {
                    if (!exists) {
                        callback(new Error("Label " + labelName + ": Dir not found: " + labelValue));
                    } else {
                        loader.addLabelResolver(labelName, resolvers.Directory, {url: labelValue});
                        callback();
                    }
                });
            }
        });
        process.nextTick(group());
    },
    error.logAndExit(function () {
        var group = this.group();
        options._.forEach(function (templateUrl) {
            var template = loader.loadAsset({type: 'HTML', url: templateUrl});
            templates.push(template);
            loader.populate(template, function (relation) {
                return relation.type === 'HTMLScript' || relation.type === 'JavaScriptStaticInclude';
            }, group());
        });
    }),
    error.logAndExit(function () {
        function makeHumanReadableFileName (asset) {
            return (asset.originalUrl || asset.url).replace(/[^a-z0-9_\-\.]/g, '_');
        }
        templates.forEach(function (template) {
            var document = template.parseTree, // Egh, gotta do it async?
                seenAssets = {};
            siteGraph.findRelations('from', template).forEach(function (htmlScriptRelation) {
                var script = htmlScriptRelation.to,
                    htmlStyleInsertionPoint;
                siteGraph.lookupSubgraph(script, function (relation) {
                    return relation.type === 'JavaScriptStaticInclude';
                }).relations.forEach(function (relation) {
                    var targetAsset = relation.to;
                    if (!(targetAsset.id in seenAssets)) {
                        seenAssets[targetAsset.id] = true;
                        if (targetAsset.type === 'CSS') {
                            var htmlStyle = new relations.HTMLStyle({from: template, to: targetAsset});
                            if (htmlStyleInsertionPoint) {
                                siteGraph.registerRelation(htmlStyle, 'after', htmlStyleInsertionPoint);
                            } else {
                                siteGraph.registerRelation(htmlStyle, 'first');
                            }
                            htmlStyleInsertionPoint = htmlStyle;
                        } else {
                            siteGraph.registerRelation(new relations.HTMLScript({from: template, to: targetAsset}), 'before', htmlScriptRelation);
                        }
                    }
                    siteGraph.unregisterRelation(relation);
                });
            });
        });
        process.nextTick(this);
    }),
    error.logAndExit(function () {
        var relationsToInline = [];
        siteGraph.relations.forEach(function (relation) {
            if (relation.to.dirty) {
                //siteGraph.inlineRelation(relation);
                relationsToInline.push(relation);
            } else if (relation.to.url) {
                relation.setUrl(relation.to.url);
            }
        });
        if (relationsToInline.length) {
            var group = this.group();
            relationsToInline.forEach(function (relation) {
                var callback = group();
                relation.to.getParseTree(function () {
                    siteGraph.inlineRelation(relation);
                    callback();
                });
            });
        } else {
            process.nextTick(this);
        }
    }),
    error.logAndExit(function () {
        templates.forEach(function (template) {
            fs.writeFile(path.join(loader.root, template.url.replace(/\.template$/, '')), template.parseTree.outerHTML, 'utf8', error.logAndExit());
        });
    }),
    error.logAndExit(function () {
        siteGraph.toGraphViz();
    })
);
