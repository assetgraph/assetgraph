var Script = process.binding('evals').Script,
    jsdom = require('jsdom'),
    _ = require('underscore'),
    step = require('step'),
    error = require('./error'),
    SiteGraph = require('./SiteGraph'),
    transforms = require('./transforms');

function JavaScriptLoader(config) {
    _.extend(this, config);
    this.siteGraph = new SiteGraph({root: config.root});
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
        that.siteGraph.transform(
            transforms.addLabelsAsCustomProtocols(weirdLabelsArray),
            function () {
                that.load(assetConfigs);
            }
        );
        return;
    }

    that.siteGraph.transform(
        transforms.addInitialAssets(assetConfigs),
        transforms.populate(function (relation) {
            return relation.type === 'JavaScriptStaticInclude';
        }),
        transforms.escapeToCallback(function (err, siteGraph) {
            if (!siteGraph.assets.length) {
                return cb(null, that.window); // Very boring case
            }
            step(
                function () {
                    var group = this.group();
                    siteGraph.findAssets('isInitial', true).forEach(function (initialAsset) {
                        var stack = [];
                        function traversePostorder(node) {
                            stack.push(node);
                            siteGraph.findRelations('from', node).forEach(function (relation) {
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
