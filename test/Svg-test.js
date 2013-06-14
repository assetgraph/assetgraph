var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph');

vows.describe('Svg').addBatch({
    'After loading a test case with an Svg asset': {
        topic: function () {
            new AssetGraph({root: __dirname + '/Svg/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 6 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 6);
        },
        'the graph should contain one Html asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html'}).length, 1);
        },
        'the graph should contain one Svg asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Svg'}).length, 1);
        },
        'the graph should contain one JavaScript asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 1);
        },
        'the graph should contain 2 Png assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Png'}).length, 2);
        },
        'the graph should contain one SvgImage relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'SvgImage'}).length, 1);
        },
        'the graph should contain one SvgScript relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'SvgScript'}).length, 1);
        },
        'the graph should contain one SvgStyleAttribute relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'SvgStyleAttribute'}).length, 1);
        },
        'the graph should contain one CssImage relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'CssImage'}).length, 1);
        }
    }
})['export'](module);
