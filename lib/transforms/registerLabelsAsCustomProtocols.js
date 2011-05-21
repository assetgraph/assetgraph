var fs = require('fs'),
    Path = require('path'),
    _ = require('underscore'),
    seq = require('seq'),
    error = require('../util/error'),
    resolvers = require('../resolvers'),
    urlTools = require('../util/urlTools');

module.exports = function (labelDefinitions) {
    if (typeof labelDefinitions === 'string') {
        labelDefinitions = [labelDefinitions];
    } else {
        labelDefinitions = labelDefinitions || [];
    }
    return function registerLabelsAsCustomProtocols(assetGraph, cb) {
        seq.ap(labelDefinitions)
            .parEach(function (labelDefinition) {
                var callback = this,
                    keyValue = labelDefinition.split('=');
                if (keyValue.length !== 2) {
                    return callback(new Error("Invalid label syntax: " + labelDefinition));
                }
                var labelName = keyValue[0],
                    labelValue = keyValue[1],
                    matchSenchaJSBuilder = labelValue.match(/\.jsb(\d)$/),
                    url;
                if (matchSenchaJSBuilder) {
                    var version = parseInt(matchSenchaJSBuilder[1], 10);
                    url = urlTools.fsFilePathToFileUrl(labelValue);
                    fs.readFile(urlTools.fileUrlToFsPath(url), 'utf-8', error.passToFunction(cb, function (fileBody) {
                        assetGraph.resolver.protocols[labelName] = new resolvers.SenchaJSBuilder({
                            url: url,
                            version: version,
                            body: JSON.parse(fileBody)
                        });
                        callback();
                    }));
                } else {
                    url = urlTools.fsDirToFileUrl(labelValue);
                    Path.exists(urlTools.fileUrlToFsPath(url), function (exists) {
                        if (!exists) {
                            callback(new Error("Label " + labelName + ": Dir not found: " + labelValue));
                        } else {
                            assetGraph.resolver.protocols[labelName] = new resolvers.Directory({
                                url: url
                            });
                            callback();
                        }
                    });
                }
            })
            .seq(function () {
                cb();
            })
            ['catch'](cb);
    };
};
