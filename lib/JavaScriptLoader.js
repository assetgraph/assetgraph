var vm = require('vm'),
    jsdom = require('jsdom'),
    _ = require('underscore'),
    seq = require('seq'),
    AssetGraph = require('./AssetGraph'),
    transforms = require('./transforms'),
    traversal = require('./traversal');

function JavaScriptLoader(config) {
    _.extend(this, config);
    this.assetGraph = new AssetGraph({root: config.root});
    this.context = vm.createContext();
    _.extend(this.context, jsdom.createWindow());
    _.extend(this.context, {
        window: this.context,
        location: 'file:',
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
        transforms.loadAssets(assetConfigs),
        transforms.populate({type: 'JavaScriptStaticInclude'}),
        transforms.stats(),
        function (err, assetGraph) {
            seq()
                .seq(function () {
                    var assetsInOrder = [];
                    assetGraph.findAssets({isInitial: true}).forEach(function (initialAsset) {
                        Array.prototype.push.apply(assetsInOrder, traversal.collectAssetsPostOrder(assetGraph, initialAsset, {to: {type: 'JavaScript'}}));
                    });
                    this(null, assetsInOrder);
                })
                .flatten()
                .parEach(function (asset) {
                    assetGraph.getAssetText(asset, this.into(asset.id));
                })
                .parEach(function (asset) {
                    try {
                        vm.runInContext(this.vars[asset.id], that.context);
                        this();
                    } catch (e) {
                        this(e);
                    }
                })
                .seq(function () {
                    cb(null, that.context);
                })
                ['catch'](cb);
        }
    );
};

module.exports = JavaScriptLoader;
