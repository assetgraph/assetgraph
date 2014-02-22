var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib');

vows.describe('transforms.requireJsConfig test').addBatch({
    'After loading shim dependency test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/requireJsConfig/shimDependency'})
                .loadAssets('index.html')
                .registerRequireJsConfig()
                .populate()
                .run(this.callback);
        },
        'the graph should contain 4 JavaScript assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 4);
        }
    },
})['export'](module);
