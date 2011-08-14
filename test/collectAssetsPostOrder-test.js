var path = require('path'),
    vows = require('vows'),
    assert = require('assert'),
    _ = require('underscore'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = AssetGraph.transforms;

vows.describe('AssetGraph.collectAssetsPostOrder').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/collectAssetsPostOrder/'}).queue(
                transforms.loadAssets('index.js'),
                transforms.populate()
            ).run(this.callback);
        },
        'the graph should contain 6 JavaScript assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 6);
        },
        'collectAssetsPostOrder should return the assets in the right order': function (assetGraph) {
            var initialAsset = assetGraph.findAssets({url: /index\.js$/})[0];
            assert.deepEqual(_.pluck(assetGraph.collectAssetsPostOrder(initialAsset, {type: 'JavaScriptOneInclude'}), 'url').map(path.basename),
                             ['c.js', 'b.js', 'a.js', 'e.js', 'd.js', 'index.js']);
        }
    }
})['export'](module);
