#!/usr/bin/env node

var util = require('util'),
    path = require('path'),
    fs = require('fs'),
    step = require('step'),
    _ = require('underscore'),
    fileUtils = require('./fileUtils'),
    assets = require('./assets'),
//    translations = require('./translations'),
    resolvers = require('./loaders/Fs/resolvers'),
    SiteGraph = require('./SiteGraph'),
    FsLoader = require('./loaders/Fs'),
    error = require('./error'),
    options = {};

process.on('uncaughtException', function (e) {
    console.log("Uncaught exception: " + sys.inspect(e.msg) + "\n" + e.stack);
});

_.each(require('optimist').usage('FIXME').demand(['assets-root']).argv,
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

var templates = [];

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
                fs.readFile(path.join(loader.root, labelValue), 'utf8', error.throwException(function (fileBody) {
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
                        throw new Error("Label " + labelName + ": Dir not found: " + labelValue);
                    }
                    loader.addLabelResolver(labelName, resolvers.Directory, {url: labelValue});
                    callback();
                });
            }
        });
        process.nextTick(group());
    },
    function () {
        var group = this.group();
        (options._ || []).forEach(function (templateUrl) {
            var template = loader.loadAsset({type: 'HTML', url: templateUrl});
            templates.push(template);
            loader.populate(template, ['htmlScript', 'jsStaticInclude'], group());
        });
    },
    function () {
try{
        templates.forEach(function (template) {
            var document = template.parseTree; // Egh, gotta do it async?
            function makeTemplateRelativeUrl(url) {
                return fileUtils.buildRelativeUrl(template.url, url);
            }
console.log("relations by type htmlScript = " + require('sys').inspect(template.getRelationsByType('htmlScript').length));
            template.getRelationsByType('htmlScript').forEach(function (htmlScriptRelation) {
                var script = relation.targetAsset,
                    linkTags = [],
                    scriptTags = [];
                siteGraph.getRelationsDeep(script, 'jsStaticInclude').forEach(function (relation) {
                    var url;
                    if ('url' in targetAsset) {
                        url = makeTemplateRelativeUrl(targetAsset.url);
                    } else {
                        // Inline or "dirty", has to be written to disc
                        url = makeTemplateRelativeUrl("build/" + makeHumanReadableFileName(targetAsset));
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
            console.log("The document = " + document.outerHTML);
        });
}catch(e){console.log("error: " + e);}
        process.nextTick(this);
    },
    error.throwException(function () {
//        siteGraph.toGraphViz();
    }),
    function (err) {
        console.log("error: " + err + "\n" + err.stack);
    }
);
