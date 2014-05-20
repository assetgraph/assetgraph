/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('assets/Svg', function () {
    it('should handle a test case with an Svg asset', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/assets/Svg/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 11);
                expect(assetGraph, 'to contain asset', 'Html');
                expect(assetGraph, 'to contain asset', 'Svg');
                expect(assetGraph, 'to contain assets', 'JavaScript', 2);
                expect(assetGraph, 'to contain assets', 'Png', 2);
                expect(assetGraph, 'to contain asset', 'Xslt');
                expect(assetGraph, 'to contain relation', 'SvgImage');
                expect(assetGraph, 'to contain relation', 'SvgScript');
                expect(assetGraph, 'to contain relation', 'SvgStyleAttribute');
                expect(assetGraph, 'to contain relation', 'CssImage');
                expect(assetGraph, 'to contain relations', 'SvgStyle', 2);
                expect(assetGraph, 'to contain relation', 'SvgFontFaceUri');
                expect(assetGraph, 'to contain relation', 'XmlStylesheet');
                expect(assetGraph, 'to contain relation', 'SvgInlineEventHandler');
                expect(assetGraph, 'to contain relation', 'SvgAnchor');
            })
            .run(done);
    });
});
