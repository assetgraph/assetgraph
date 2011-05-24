var vm = require('vm'),
    jsdom = require('jsdom'),
    _ = require('underscore'),
    seq = require('seq'),
    AssetGraph = require('./AssetGraph'),
    transforms = AssetGraph.transforms;

function JavaScriptLoader(config) {
    _.extend(this, config);
    this.assetGraph = new AssetGraph({root: config.root});
    this.context = vm.createContext();
    _.extend(this.context, jsdom.createWindow());
    _.extend(this.context, {
        window: this.context,
        location: 'file:',
        document: {}
    });
}

JavaScriptLoader.prototype.load = function (assetConfigs, cb) {
    var that = this;
    if (!that.labelsAdded && that.labels) {
        that.labelsAdded = true;
        that.assetGraph.queue(transforms.registerLabelsAsCustomProtocols(that.labels));
    }

    that.assetGraph.queue(
        transforms.loadAssets(assetConfigs),
        transforms.populate({type: 'JavaScriptStaticInclude'}),
        transforms.injectOneBootstrapper({isInitial: true}),
        function (assetGraph) {
            seq()
                .seq(function () {
                    var assetsInOrder = [];
                    assetGraph.findAssets({isInitial: true}).forEach(function (initialAsset) {
                        Array.prototype.push.apply(assetsInOrder, AssetGraph.traversal.collectAssetsPostOrder(assetGraph, initialAsset, {to: {type: 'JavaScript'}}));
                    });
                    this(null, assetsInOrder);
                })
                .flatten()
                .parEach(function (asset) {
                    assetGraph.getAssetText(asset, this.into(asset.id));
                })
                .parEach(function (asset) {
                    try {
                        vm.runInContext(this.vars[asset.id], that.context, asset.url || '(inline)');
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
    ).run();
};

module.exports = JavaScriptLoader;
