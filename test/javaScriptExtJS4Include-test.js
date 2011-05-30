var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = AssetGraph.transforms,
    query = AssetGraph.query;

vows.describe('Changing the url of assets').addBatch({
    'After loading a test case with three assets': {
        topic: function () {
            new AssetGraph({root: __dirname + '/javaScriptExtJS4Include/'}).queue(
                transforms.loadAssets('index.html'),
                transforms.populate()
            ).run(this.callback);
        },
        'the graph should contain 3 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 3);
        },
        'the graph should contain one JavaScriptExtJS4Include relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'JavaScriptExtJS4Include'}).length, 1);
        },
        'then run the flattenStaticIncludes transform': {
            topic: function (assetGraph) {
                assetGraph.queue(transforms.flattenStaticIncludes({isInitial: true})).run(this.callback);
            },
            'the graph should contain two HTMLScript relations pointing at /Foo/Bar.js and the inline script, respectively': function (assetGraph) {
                var htmlScriptUrls = assetGraph.findRelations({from: {isInitial: true}, type: 'HTMLScript'}).map(function (relation) {
                    return relation._getRawUrlString();
                });
                assert.deepEqual(htmlScriptUrls, ['Foo/Bar.js', undefined]);
            }
        }
    }
})['export'](module);
