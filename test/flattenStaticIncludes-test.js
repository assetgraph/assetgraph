var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = AssetGraph.transforms,
    query = AssetGraph.query;

vows.describe('flattenStaticIncludes transform').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/flattenStaticIncludes/'}).queue(
                transforms.loadAssets('index.html'),
                transforms.populate()
            ).run(this.callback);
        },
        'the graph should contain 10 JavaScript assets, including two inline ones': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 10);
            assert.equal(assetGraph.findAssets({type: 'JavaScript', url: query.isUndefined}).length, 2);
        },
        'then run the flattenStaticIncludes transform on the Html asset': {
            topic: function (assetGraph) {
                assetGraph.runTransform(transforms.flattenStaticIncludes({type: 'Html'}), this.callback);
            },
            'the injected <script> tags should be in the right order': function (assetGraph) {
                assert.deepEqual(assetGraph.findRelations({from: assetGraph.findAssets({type: 'Html'})[0]}).map(function (relation) {return relation._getRawUrlString();}),
                                [
                                    'a.js',
                                    'b.js',
                                    'c.js',
                                    'd.js',
                                    undefined,
                                    'e.js',
                                    'f.js',
                                    'g.js',
                                    'h.js',
                                    undefined
                                ]);
            }
        }
    }
})['export'](module);
