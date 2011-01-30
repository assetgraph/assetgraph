var fs = require('fs'),
    path = require('path'),
    step = require('step'),
    error = require('../error'),
    resolvers = require('../resolvers'),
    fileUtils = require('../fileUtils');

exports.registerLabelsAsCustomProtocols = function (labelDefinitions) {
    return function registerLabelsAsCustomProtocols(assetGraph, cb) {
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
                        matchSenchaJSBuilder = labelValue.match(/\.jsb(\d)$/);
                    if (matchSenchaJSBuilder) {
                        var version = parseInt(matchSenchaJSBuilder[1], 10);
                        fs.readFile(fileUtils.fileUrlToFsPath(assetGraph.root) + '/' + labelValue, 'utf8', error.passToFunction(cb, function (fileBody) {
                            assetGraph.customProtocols[labelName] = new resolvers.SenchaJSBuilder({
                                url: assetGraph.root + labelValue,
                                version: version,
                                body: JSON.parse(fileBody)
                            });
                            callback();
                        }));
                    } else {
                        path.exists(fileUtils.fileUrlToFsPath(assetGraph.root) + '/' + labelValue, function (exists) {
                            if (!exists) {
                                callback(new Error("Label " + labelName + ": Dir not found: " + labelValue));
                            } else {
                                assetGraph.customProtocols[labelName] = new resolvers.Directory({
                                    url: assetGraph.root + labelValue
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
