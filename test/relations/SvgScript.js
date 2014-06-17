/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/SvgScript', function () {
    it('should handle a test case with an inline <script> element', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/SvgScript/'})
            .loadAssets('logo.svg')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Svg', 1);
                expect(assetGraph, 'to contain relations', 'SvgScript', 1);
                expect(assetGraph, 'to contain assets', 'JavaScript', 1);

                expect(assetGraph.findRelations()[0].to.isInline, 'to be true');
            })
            .run(done);
    });

    it('should handle a test case with an external <script> element', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/SvgScript/'})
            .loadAssets('logo-external.svg')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Svg', 1);
                expect(assetGraph, 'to contain relations', 'SvgScript', 1);
                expect(assetGraph, 'to contain assets', 'JavaScript', 1);

                expect(assetGraph.findRelations()[0].to.isInline, 'to be false');
            })
            .run(done);
    });

    it('should externalize inline <script> elements correctly', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/SvgScript/'})
            .loadAssets('logo.svg')
            .populate()
            .externalizeRelations()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Svg', 1);
                expect(assetGraph, 'to contain relations', 'SvgScript', 1);
                expect(assetGraph, 'to contain assets', 'JavaScript', 1);

                expect(assetGraph.findRelations()[0].to.isInline, 'to be false');
            })
            .run(done);
    });

    it('should inline external <script> elements correctly', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/SvgScript/'})
            .loadAssets('logo-external.svg')
            .populate()
            .inlineRelations()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Svg', 1);
                expect(assetGraph, 'to contain relations', 'SvgScript', 1);
                expect(assetGraph, 'to contain assets', 'JavaScript', 1);

                expect(assetGraph.findRelations()[0].to.isInline, 'to be true');
            })
            .run(done);
    });
});
