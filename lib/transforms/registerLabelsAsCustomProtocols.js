var fs = require('fs'),
    path = require('path'),
    _ = require('underscore'),
    step = require('step'),
    error = require('../error'),
    resolvers = require('../resolvers'),
    fileUtils = require('../fileUtils');

exports.registerLabelsAsCustomProtocols = function (labelDefinitions) {
    if (typeof labelDefinitions === 'string') {
        labelDefinitions = [labelDefinitions];
    } else {
        labelDefinitions = labelDefinitions || [];
    }
    return function registerLabelsAsCustomProtocols(err, assetGraph, cb) {
        step(
            function () {
                var group = this.group();
                labelDefinitions.forEach(function (labelDefinition) {
                    var keyValue = labelDefinition.split('=');
                    if (keyValue.length !== 2) {
                        return group()(new Error("Invalid label syntax: " + labelDefinition));
                    }
                    var labelName = keyValue[0],
                        labelValue = keyValue[1],
                        callback = group(),
                        matchSenchaJSBuilder = labelValue.match(/\.jsb(\d)$/),
                        url;
                    if (matchSenchaJSBuilder) {
                        var version = parseInt(matchSenchaJSBuilder[1], 10);
                        url = fileUtils.fsFilePathToFileUrl(labelValue);
                        fs.readFile(fileUtils.fileUrlToFsPath(url), 'utf8', error.passToFunction(cb, function (fileBody) {
                            assetGraph.resolver.protocols[labelName] = new resolvers.SenchaJSBuilder({
                                url: url,
                                version: version,
                                body: JSON.parse(fileBody)
                            });
                            callback();
                        }));
                    } else {
                        url = fileUtils.fsDirToFileUrl(labelValue);
                        path.exists(fileUtils.fileUrlToFsPath(url), function (exists) {
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
                });
                process.nextTick(group()); // Make sure it's called at least once
            },
            cb
        );
    };
};
