var fs = require('fs'),
    Path = require('path'),
    _ = require('underscore'),
    seq = require('seq'),
    error = require('../util/error'),
    resolvers = require('../resolvers'),
    urlTools = require('../util/urlTools');

module.exports = function (labelDefinitionObj) {
    var labelByName = {};
    if (_.isString(labelDefinitionObj)) {
        labelDefinitionObj = [labelDefinitionObj];
    }
    if (_.isArray(labelDefinitionObj)) {
        labelDefinitionObj.forEach(function (keyEqualsValueStr) {
            if (!_.isString(keyEqualsValueStr)) {
                throw new Error("transforms.registerLabelsAsCustomProtocols: Invalid label definition syntax: " + labelDefinitionObj);
            }
            var keyValue = keyEqualsValueStr.split('=');
            if (keyValue.length !== 2) {
                throw new Error("transforms.registerLabelsAsCustomProtocols: Label definition doesn't contain exactly one equals sign: " + keyEqualsValueStr);
            }
            labelByName[keyValue[0]] = keyValue[1];
        });
    } else if (typeof labelDefinitionObj === 'object') {
        labelByName = labelDefinitionObj;
    }

    return function registerLabelsAsCustomProtocols(assetGraph, cb) {
        seq.ap(_.keys(labelByName))
            .parEach(function (labelName) {
                var callback = this,
                    labelValue = labelByName[labelName],
                    matchSenchaJSBuilder = labelValue.match(/\.jsb(\d)$/),
                    url;
                if (matchSenchaJSBuilder) {
                    var jsbVersion = parseInt(matchSenchaJSBuilder[1], 10);
                    url = urlTools.fsFilePathToFileUrl(labelValue);
                    fs.readFile(urlTools.fileUrlToFsPath(url), 'utf-8', error.passToFunction(cb, function (jsbBody) {
                        assetGraph.resolverByProtocol[labelName] = resolvers.senchaJSBuilder(url, jsbVersion, JSON.parse(jsbBody));
                        callback();
                    }));
                } else {
                    url = urlTools.fsDirToFileUrl(labelValue);
                    Path.exists(urlTools.fileUrlToFsPath(url), function (exists) {
                        if (!exists) {
                            callback(new Error("Label " + labelName + ": Dir not found: " + labelValue));
                        } else {
                            assetGraph.resolverByProtocol[labelName] = resolvers.fixedDirectory(url);
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
