var Script = process.binding('evals').Script,
    jsdom = require('jsdom'),
    _ = require('underscore'),
    step = require('step'),
    error = require('./error'),
    AssetGraph = require('./AssetGraph'),
    transforms = require('./transforms');

function JavaScriptLoader(config) {
    _.extend(this, config);
    this.assetGraph = new AssetGraph({root: config.root});
    this.window = _.extend(jsdom.createWindow(), {
        document: {},
        one: {
            include: function () {},
            exclude: function () {}
        }
    });
}

JavaScriptLoader.prototype.load = function (assetConfigs, cb) {
    var that = this;
    if (!that.labelsAdded && that.labels) {
        that.labelsAdded = true;
        var weirdLabelsArray = _.map(this.labels, function (value, labelName) {
            return labelName + "=" + value;
        });
        that.assetGraph.transform(
            transforms.registerLabelsAsCustomProtocols(weirdLabelsArray),
            function () {
                process.nextTick(function () {
                    that.load(assetConfigs, cb);
                });
            }
        );
        return;
    }

    that.assetGraph.transform(
        transforms.addAssets(assetConfigs),
        transforms.populate(function (relation) {
            return relation.type === 'JavaScriptStaticInclude';
        }),
        transforms.escapeToCallback(function (err, assetGraph) {
            if (!assetGraph.assets.length) {
                return cb(null, that.window); // Very boring case
            }
            step(
                function () {
                    var group = this.group(),
                        seenAssets = {};
                    assetGraph.findAssets('isInitial', true).forEach(function (initialAsset) {
                        var stack = [];
                        (function traversePostorder(asset) {
                            if (!seenAssets[asset.id]) {
                                seenAssets[asset.id] = true;
                                stack.push(asset);
                                assetGraph.findRelations('from', asset).forEach(function (relation) {
                                    traversePostorder(relation.to);
                                });
                                stack.pop().getOriginalSrc(group());
                            }
                        }(initialAsset));
                    });
                },
                error.passToFunction(cb, function (srcs) {
                    var err = null;
                    try {
                        Script.runInNewContext(srcs.join("\n"), that.window);
                    } catch(e) {
                        err = e;
                    }
                    cb(err, that.window);
                })
            );
        })
    );
};

exports.JavaScriptLoader = JavaScriptLoader;
