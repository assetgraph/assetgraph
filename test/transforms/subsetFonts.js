var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('transforms/subsetFonts', function () {
    it('should create a subsetted font', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/subsetFonts/subsetableFont/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relation', 'CssFontFaceSrc');
            })
            .subsetFonts()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'CssFontFaceSrc', 2);
                var cssFontFaceSrcRelations = assetGraph.findRelations({type: 'CssFontFaceSrc'});
                expect(cssFontFaceSrcRelations[0].from.text, 'to contain',
                    'unicode-range: U+2E, U+54, U+62-63, U+65-66, U+68-69, U+6B, U+6E-6F, U+71-72, U+74-75, U+77-78;');
            });
    });
});
