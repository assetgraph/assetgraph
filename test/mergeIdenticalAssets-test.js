var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph');

vows.describe('transforms.mergeIdenticalAssets').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/mergeIdenticalAssets/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback)
        },
        'the graph should contain 4 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 4);
        },
        'the graph should contain 1 Html asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html'}).length, 1);
        },
        'the graph should contain 2 Png assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Png'}).length, 2);
        },
        'the graph should contain 2 HtmlImage relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlImage'}).length, 2);
        },
        'the cache manifest should have 2 outgoing relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({from: {type: 'CacheManifest'}}).length, 2);
        },
        'then running the mergeIdenticalAssets transform': {
            topic: function (assetGraph) {
                assetGraph.mergeIdenticalAssets().run(this.callback)
            },
            'the graph should contain 1 Png asset': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'Png'}).length, 1);
            },
            'the cache manifest should contain 1 outgoing relation': function (assetGraph) {
                assert.equal(assetGraph.findRelations({from: {type: 'CacheManifest'}}).length, 1);
            },
            'both HtmlImage relations should point at the same image': function (assetGraph) {
                var htmlImages = assetGraph.findRelations({type: 'HtmlImage'});
                assert.equal(htmlImages.length, 2);
                assert.equal(htmlImages[0].to, htmlImages[1].to);
            }
        }
    }
})['export'](module);
