var fs = require('fs'),
    path = require('path'),
    step = require('step'),
    error = require('../error'),
    resolvers = require('../resolvers'),
    fileUtils = require('../fileUtils');

exports.registerLabelsAsCustomProtocols = function registerLabelsAsCustomProtocols(labelDefinitions) {
    return function (siteGraph, cb) {
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
                        fs.readFile(fileUtils.fileUrlToFsPath(siteGraph.root) + '/' + labelValue, 'utf8', error.passToFunction(cb, function (fileBody) {
                            siteGraph.customProtocols[labelName] = new resolvers.SenchaJSBuilder({
                                url: siteGraph.root + labelValue,
                                version: version,
                                body: JSON.parse(fileBody)
                            });
                            callback();
                        }));
                    } else {
                        path.exists(fileUtils.fileUrlToFsPath(siteGraph.root) + '/' + labelValue, function (exists) {
                            if (!exists) {
                                callback(new Error("Label " + labelName + ": Dir not found: " + labelValue));
                            } else {
                                siteGraph.customProtocols[labelName] = new resolvers.Directory({
                                    url: siteGraph.root + labelValue
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
