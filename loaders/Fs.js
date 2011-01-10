var util = require('util'),
    sys = require('sys'),
    fs = require('fs'),
    path = require('path'),
    step = require('step'),
    _ = require('underscore'),
    assets = require('../assets'),
    error = require('../error'),
    resolvers = require('./Fs/resolvers'),
    request = require('request'),
    Base = require('./Base');

var Fs = module.exports = function (config) {
    Base.apply(this, arguments);
    this.labelResolvers = {};
    this.defaultLabelResolver = new resolvers.FindParentDirectory({root: this.root});
};

util.inherits(Fs, Base);

_.extend(Fs.prototype, {
    addLabelResolver: function (labelName, Constructor, config) {
        config = config || {};
        config.root = this.root;
        this.labelResolvers[labelName] = new Constructor(config);
    },

    // cb(err, resolvedAssetConfigs)
    resolveAssetConfig: function (assetConfig, baseUrl, cb) {
        if ('src' in assetConfig) {
            // Inline asset, no need to resolve any further
            process.nextTick(function () {
                return cb(null, [assetConfig]);
            });
        } else if ('url' in assetConfig) {
            var This = this,
                matchLabel = assetConfig.url.match(/^([\w\-]+):(.*)$/);
            if (matchLabel) {
                var label = matchLabel[1];
                if (!('originalUrl' in assetConfig)) {
                    assetConfig.originalUrl = assetConfig.url;
                }
                assetConfig.url = matchLabel[2];
                var resolver = This.labelResolvers[label] || This.defaultLabelResolver;

                resolver.resolve(assetConfig, label, baseUrl, error.passToFunction(cb, function (resolvedAssetConfigs) {
                    step(
                        function () {
                            if (resolvedAssetConfigs.length) {
                                var group = this.group();
                                resolvedAssetConfigs.forEach(function (resolvedAssetConfig) {
                                    if ('url' in resolvedAssetConfig && /[\w\-]+:/.test(resolvedAssetConfig.url)) {
                                        // Reresolve, probably ext: remapped to ext-base:
                                        This.resolveAssetConfig(resolvedAssetConfig, baseUrl, group());
                                    } else {
                                        group()(null, [resolvedAssetConfig]);
                                    }
                                });
                            } else {
                                cb(new Error("assetConfig resolved to nothing: " + sys.inspect(assetConfig)));
                            }
                        },
                        error.passToFunction(cb, function (resolvedAssetConfigArrays) {
                            cb(null, _.flatten(resolvedAssetConfigArrays));
                        })
                    );
                }));
            } else {
                // No label, assume relative path
                assetConfig.url = path.join(baseUrl, assetConfig.url);
                cb(null, [assetConfig]);
            }
        } else {
            // No url and no inlineData, give up.
            cb(new Error("Cannot resolve pointer"));
        }
    },

    getSrcProxy: function (assetConfig) {
        var This = this;
        return function (cb) {
            // Will be invoked in the asset's scope, so this.encoding works out.
            fs.readFile(path.join(This.root, assetConfig.url), this.encoding, cb);
        };
    }
});
