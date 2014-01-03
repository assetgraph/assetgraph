var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib');

vows.describe('Svg').addBatch({
    'After loading a test case with an Svg asset': {
        topic: function () {
            new AssetGraph({root: __dirname + '/Svg/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 11 loaded assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 11);
        },
        'the graph should contain one Html asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html'}).length, 1);
        },
        'the graph should contain one Svg asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Svg'}).length, 1);
        },
        'the graph should contain 2 JavaScript assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 2);
        },
        'the graph should contain 2 Png assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Png'}).length, 2);
        },
        'the graph should contain one Xslt asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Xslt'}).length, 1);
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
        },
        'the graph should contain 2 SvgStyle relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'SvgStyle'}).length, 2);
        },
        'the graph should contain one SvgFontFaceUri relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'SvgFontFaceUri'}).length, 1);
        },
        'the graph should contain one XmlStylesheet relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'XmlStylesheet'}).length, 1);
        },
        'the graph should contain one SvgInlineEventHandler relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'SvgInlineEventHandler'}).length, 1);
        },
        'the graph should contain one SvgAnchor relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'SvgAnchor'}).length, 1);
        }
    }
})['export'](module);
