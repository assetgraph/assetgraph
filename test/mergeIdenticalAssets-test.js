var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib');

vows.describe('mergeIdenticalAssets').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/mergeIdenticalAssets/combo/'})
                .loadAssets('index.html')
                .populate()
                .run(done);
        },
        'the graph should contain 4 assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 4);
        },
        'the graph should contain 1 Html asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Html');
        },
        'the graph should contain 2 Png assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'Png', 2);
        },
        'the graph should contain 2 HtmlImage relations': function (assetGraph) {
            expect(assetGraph, 'to contain relations', 'HtmlImage', 2);
        },
        'the cache manifest should have 2 outgoing relations': function (assetGraph) {
            expect(assetGraph, 'to contain relations', {from: {type: 'CacheManifest'}}, 2);
        },
        'then running the mergeIdenticalAssets transform': {
            topic: function (assetGraph) {
                assetGraph.mergeIdenticalAssets().run(done);
            },
            'the graph should contain 1 Png asset': function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Png');
            },
            'the cache manifest should contain 1 outgoing relation': function (assetGraph) {
                expect(assetGraph, 'to contain relation', {from: {type: 'CacheManifest'}});
            },
            'both HtmlImage relations should point at the same image': function (assetGraph) {
                var htmlImages = assetGraph.findRelations({type: 'HtmlImage'});
                expect(htmlImages, 'to have length', 2);
                expect(htmlImages[0].to, 'to equal', htmlImages[1].to);
            }
        }
    },
    'After loading a test case with a JavaScript asset and a Css asset with identical contents, then running the mergeIdenticalAssets transform': {
        topic: function () {
            new AssetGraph({root: __dirname + '/mergeIdenticalAssets/identicalAssetsOfDifferentTypes/'})
                .loadAssets('index.html')
                .populate()
                .run(done);
        },
        'the graph should contain 2 JavaScript asset': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'JavaScript', 2);
        },
        'the graph should contain 2 Css assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'Css', 2);
        },
        'then running the mergeIdenticalAssets transform': {
            topic: function (assetGraph) {
                assetGraph.mergeIdenticalAssets().run(done);
            },
            'the graph should contain 1 JavaScript asset': function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'JavaScript');
            },
            'the graph should contain 1 Css asset': function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Css');
            }
        }
    }
})['export'](module);
