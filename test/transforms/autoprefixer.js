/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib/AssetGraph');

describe('transforms.autoprefixer', function () {
    it('should handle an unprefixed test case', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/autoprefixer/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'HtmlStyle', 2);
                expect(assetGraph, 'to contain relations', 'CssImage', 1);
            })
            .autoprefixer('last 100 versions')
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'HtmlStyle', 2);
                expect(assetGraph, 'to contain relations', 'CssImage', 4);
            })
            .run(done);
    });

    it('should handle a simple option case', function (done) {
        expect(function () {
            new AssetGraph({root: __dirname + '/../../testdata/transforms/autoprefixer/'})
                .loadAssets('index.html')
                .populate()
                .autoprefixer('last 2 versions')
                .run(done);
        }, 'not to throw');
    });

    it('should handle a complex option case', function (done) {
        expect(function () {
            new AssetGraph({root: __dirname + '/../../testdata/transforms/autoprefixer/'})
                .loadAssets('index.html')
                .populate()
                .autoprefixer('last 2 versions, ie > 8,ff > 28')
                .run(done);
        }, 'not to throw');
    });

    it('should preserve source information', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/autoprefixer/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                assetGraph.findAssets({type: 'Css'})[0].parseTree.source.input.file = 'http://example.com/style.css';
            })
            .autoprefixer('last 2 versions, ie > 8,ff > 28', { sourceMaps: true })
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({type: 'Css'})[0].sourceMap, 'to satisfy', {
                    sources: expect.it('to contain', 'http://example.com/style.css')
                });
            });
    });

    it('should preserve source maps', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/autoprefixer/existingExternalSourceMap'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Css');
                expect(assetGraph, 'to contain asset', 'SourceMap');
            })
            .autoprefixer('last 2 versions, ie > 8,ff > 28', { sourceMaps: true })
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Css');
                expect(assetGraph.findAssets({ type: 'Css' })[0].text, 'to contain', 'sourceMappingURL');
                expect(assetGraph, 'to contain asset', 'SourceMap');
                expect(assetGraph.findAssets({ type: 'SourceMap' })[0].parseTree.sources, 'to contain', 'foo.less');
            });
    });
});
