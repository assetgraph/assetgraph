var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib');

vows.describe('transforms.requireJsConfig test').addBatch({
    'After loading shim dependency test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/requireJsConfig/shimDependency'})
                .loadAssets('index.html')
                .registerRequireJsConfig()
                .populate()
                .run(done);
        },
        'the graph should contain 4 JavaScript assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'JavaScript', 4);
        }
    },
})['export'](module);
