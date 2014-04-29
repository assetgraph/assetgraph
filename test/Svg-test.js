var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
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
            expect(assetGraph, 'to contain assets', 11);
        },
        'the graph should contain one Html asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Html');
        },
        'the graph should contain one Svg asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Svg');
        },
        'the graph should contain 2 JavaScript assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'JavaScript', 2);
        },
        'the graph should contain 2 Png assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'Png', 2);
        },
        'the graph should contain one Xslt asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Xslt');
        },
        'the graph should contain one SvgImage relation': function (assetGraph) {
            expect(assetGraph, 'to contain relation', 'SvgImage');
        },
        'the graph should contain one SvgScript relation': function (assetGraph) {
            expect(assetGraph, 'to contain relation', 'SvgScript');
        },
        'the graph should contain one SvgStyleAttribute relation': function (assetGraph) {
            expect(assetGraph, 'to contain relation', 'SvgStyleAttribute');
        },
        'the graph should contain one CssImage relation': function (assetGraph) {
            expect(assetGraph, 'to contain relation', 'CssImage');
        },
        'the graph should contain 2 SvgStyle relations': function (assetGraph) {
            expect(assetGraph, 'to contain relations', 'SvgStyle', 2);
        },
        'the graph should contain one SvgFontFaceUri relation': function (assetGraph) {
            expect(assetGraph, 'to contain relation', 'SvgFontFaceUri');
        },
        'the graph should contain one XmlStylesheet relation': function (assetGraph) {
            expect(assetGraph, 'to contain relation', 'XmlStylesheet');
        },
        'the graph should contain one SvgInlineEventHandler relation': function (assetGraph) {
            expect(assetGraph, 'to contain relation', 'SvgInlineEventHandler');
        },
        'the graph should contain one SvgAnchor relation': function (assetGraph) {
            expect(assetGraph, 'to contain relation', 'SvgAnchor');
        }
    }
})['export'](module);
