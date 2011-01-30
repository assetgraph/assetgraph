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
    this.window = jsdom.createWindow();
    this.window.one = {
        include: function () {},
        exclude: function () {}
    };
}

JavaScriptLoader.prototype.load = function (assetConfigs, cb) {
    var that = this;
    if (!that.labelsAdded && that.labels) {
        that.labelsAdded = true;
        var weirdLabelsArray = [];
        _.each(this.labels, function (value, labelName) {
            weirdLabelsArray.push(labelName + "=" + value);
        });
        that.assetGraph.transform(
            transforms.addLabelsAsCustomProtocols(weirdLabelsArray),
            function () {
                that.load(assetConfigs);
            }
        );
        return;
    }

    that.assetGraph.transform(
        transforms.addInitialAssets(assetConfigs),
        transforms.populate(function (relation) {
            return relation.type === 'JavaScriptStaticInclude';
        }),
        transforms.escapeToCallback(function (err, assetGraph) {
            if (!assetGraph.assets.length) {
                return cb(null, that.window); // Very boring case
            }
            step(
                function () {
                    var group = this.group();
                    assetGraph.findAssets('isInitial', true).forEach(function (initialAsset) {
                        var stack = [];
                        function traversePostorder(node) {
                            stack.push(node);
                            assetGraph.findRelations('from', node).forEach(function (relation) {
                                traversePostorder(relation.to);
                            });
                            stack.pop().getOriginalSrc(group());
                        }
                        traversePostorder(initialAsset);
                    });
                },
                error.passToFunction(cb, function (srcs) {
                    srcs.forEach(function (src) {
                        Script.runInNewContext(src, that.window);
                    });
                    cb(null, that.window);
                })
            );
        })
    );
};

exports.JavaScriptLoader = JavaScriptLoader;
