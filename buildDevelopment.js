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

_.each(require('optimist').usage('FIXME').demand(['root', 'fixup-url']).argv,
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
        if ('fixupUrl' in options) {
            fileUtils.mkpath(path.join(loader.root, options.fixupUrl), this.parallel());
        }
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
            function makeTemplateRelativeUrl(url) {
                return fileUtils.buildRelativeUrl(fileUtils.dirnameNoDot(template.url), url);
            }
            siteGraph.findRelations('from', template).forEach(function (htmlScriptRelation) {
                var script = htmlScriptRelation.to;
/*,
                    firstScriptTag = document.getElementsByTagName('script')[0],
                    styleInsertionPoint;
                if (firstScriptTag && firstScriptTag.parentNode === document.head) {
                    styleInsertionPoint = firstScriptTag.previousSibling;
                } else {
                    styleInsertionPoint = document.head.lastChild;
                }
*/
                siteGraph.lookupSubgraph(script, function (relation) {
                    return relation.type === 'JavaScriptStaticInclude';
                }).relations.forEach(function (relation) {
                    var targetAsset = relation.to;
                    if (!(targetAsset.id in seenAssets)) {
                        seenAssets[targetAsset.id] = true;
                        var url;
                        if (!targetAsset.dirty && 'url' in targetAsset) {
                            url = makeTemplateRelativeUrl(targetAsset.url);
                        } else {
                            // "Dirty" or inline, has to be written to disc
                            var rewrittenUrl = path.join(options.fixupUrl, makeHumanReadableFileName(targetAsset));
                            if (targetAsset.type === 'CSS') {
                                // FIXME: This should be done by manipulating the relations properly
                                targetAsset.src = targetAsset.src.replace(/url\(/g, function () {
                                    var relativeUrl = fileUtils.buildRelativeUrl(options.fixupUrl, fileUtils.dirnameNoDot(targetAsset.url));
                                    return "url(" + relativeUrl + "/";
                                });
                            }
                            fs.writeFile(path.join(loader.root, rewrittenUrl), targetAsset.src, targetAsset.encoding, error.logAndExit());
                            url = makeTemplateRelativeUrl(rewrittenUrl);
                        }
                        if (targetAsset.type === 'CSS') {
                            siteGraph.registerRelation(new relations.HTMLStyle({from: template, to: targetAsset}), htmlScriptRelation, 'before'); // FIXME
                        } else {
                            siteGraph.registerRelation(new relations.HTMLScript({from: template, to: targetAsset}), htmlScriptRelation, 'before');
                        }
                        siteGraph.unregisterRelation(relation);
                    }
                });
            });
        });
        process.nextTick(this);
    }),
    error.logAndExit(function () {
        siteGraph.assets.forEach(function (asset) {
        });
        siteGraph.relations.forEach(function (relation) {
            if (relation.to.url) {
                relation.setUrl(relation.to.url);
            } else {
                relation.inline();
            }
        });
        process.nextTick(this);
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
