var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = require('../lib/transforms');

vows.describe('css behavior').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/cssBehavior/'}).transform(
                transforms.loadAssets('index.html'),
                transforms.populate(),
                this.callback
            );
        },
        'the graph should contain a single HTC asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'HTC'}).length, 1);
        }
    }
})['export'](module);
