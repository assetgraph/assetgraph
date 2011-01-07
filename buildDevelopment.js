#!/usr/bin/env node

var util = require('util'),
    path = require('path'),
    fs = require('fs'),
    step = require('./3rdparty/step'),
    _ = require('underscore'),
    fileUtils = require('./fileUtils'),
    assets = require('./assets'),
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
                var url = path.dirname(labelValue) || '',
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
            loader.populate(template, ['htmlScript', 'jsStaticInclude'], group());
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
                return fileUtils.buildRelativeUrl(path.dirname(template.url), url);
            }
            template.getRelationsByType('htmlScript').forEach(function (htmlScriptRelation) {
                var script = htmlScriptRelation.targetAsset,
                    linkTags = [],
                    scriptTags = [];
                siteGraph.getRelationsDeep(script, 'jsStaticInclude').forEach(function (relation) {
                    var targetAsset = relation.targetAsset;
                    if (!(targetAsset.id in seenAssets)) {
                        seenAssets[targetAsset.id] = true;
                        var url;
                        if ('url' in targetAsset) {
                            url = makeTemplateRelativeUrl(targetAsset.url);
                        } else {
                            // "Dirty", has to be written to disc
                            var rewrittenUrl = path.join(options.fixupUrl, makeHumanReadableFileName(targetAsset));
                            fs.writeFile(path.join(loader.root, rewrittenUrl), targetAsset.src, targetAsset.encoding, error.logAndExit());
                            url = makeTemplateRelativeUrl(rewrittenUrl);
                        }
                        if (targetAsset.type === 'CSS') {
                            var linkTag = document.createElement('link');
                            linkTag.rel = 'stylesheet';
                            linkTag.href = url;
                            linkTags.push(linkTag);
                        } else {
                            var scriptTag = document.createElement('script');
                            scriptTag.src = url;
                            scriptTags.push(scriptTag);
                        }
                    }
                });
                var htmlScriptTag = htmlScriptRelation.pointer.tag;
                scriptTags.forEach(function (scriptTag) {
                    htmlScriptTag.parentNode.insertBefore(scriptTag, htmlScriptTag);
                });
                var existingScriptTags = document.getElementsByTagName('script'),
                    firstExistingScriptTag = existingScriptTags.length > 0 && existingScriptTags[0],
                    head = document.head;
                if (firstExistingScriptTag && firstExistingScriptTag.parentNode === head) {
                    linkTags.reverse().forEach(function (linkTag) {
                        head.insertBefore(linkTag, firstExistingScriptTag);
                    });
                } else {
                    linkTags.forEach(function (linkTag) {
                        head.appendChild(linkTag);
                    });
                }
            });
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
