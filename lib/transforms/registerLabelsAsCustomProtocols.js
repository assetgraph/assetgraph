var fs = require('fs'),
    Path = require('path'),
    _ = require('underscore'),
    resolvers = require('../resolvers'),
    seq = require('seq'),
    passError = require('../util/passError'),
    urlTools = require('../util/urlTools');

module.exports = function (labelDefinitions) {
    if (!labelDefinitions) {
        labelDefinitions = [];
    } else if (_.isString(labelDefinitions)) {
        labelDefinitions = [labelDefinitions];
    }
    if (_.isArray(labelDefinitions)) {
        labelDefinitions = labelDefinitions.map(function (labelDefinition) {
            if (_.isString(labelDefinition)) {
                var matchNameTypeAndUrl = labelDefinition.match(/^([^:=]+)(?::([^=]+))?=(.*)$/);
                if (!matchNameTypeAndUrl) {
                    throw new Error("transforms.registerLabelsAsCustomProtocols: Invalid label definition syntax: " + keyEqualsValueStr);
                }
                var type = null;
                labelDefinition = {
                    name: matchNameTypeAndUrl[1],
                    type: matchNameTypeAndUrl[2] || null,
                    url: matchNameTypeAndUrl[3]
                };
            } else if (typeof labelDefinition !== 'object' || labelDefinition === null) {
                throw new Error('transforms.registerLabelsAsCustomProtocols: Invalid label definition: ' + labelDefinition);
            }
            if (!('url' in labelDefinition) || !('name' in labelDefinition)) {
                throw new Error("transforms.registerLabelsAsCustomProtocols: 'name' and 'url' options are mandatory.");
            }
            if (labelDefinition.type && !(labelDefinition.type in resolvers)) {
                throw new Error('transforms.registerLabelsAsCustomProtocols: Unknown resolver type: ' + labelDefinition.type);
            }
            return labelDefinition;
        });
    } else {
        throw new Error("transforms.registerLabelsAsCustomProtocols: Invalid label definitions: " + labelDefinitions);
    }

    return function registerLabelsAsCustomProtocols(assetGraph, cb) {
        seq.ap(labelDefinitions)
            .parEach(function (labelDefinition) {
                var callback = this,
                    resolverName = labelDefinition.type || (/\.jsb\d+$/.test(labelDefinition.url) ? 'senchaJsBuilder' : 'fixedDirectory');

                try {
                    assetGraph.resolverByProtocol[labelDefinition.name] = resolvers[resolverName](urlTools.fsFilePathToFileUrl(labelDefinition.url));
                } catch (err) {
                    err.message = "transforms.registerLabelsAsCustomProtocols: Error initializing resolver: " + err.message;
                    return this(err);
                }
                this();
            })
            .seq(function () {
                cb();
            })
            ['catch'](cb);
    };
};
