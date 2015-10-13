/*global describe, it*/
var expect = require('../unexpected-with-plugins');
var AssetGraph = require('../../lib/');

describe('transforms/removeOrPolyfillSystemJs', function () {
    it('should remove system.js when instructed to', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/removeOrPolyfillSystemJs/simple/'})
            .registerRequireJsConfig({ preventPopulationOfJavaScriptAssetsUntilConfigHasBeenFound: true })
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Html', 1);
                expect(assetGraph, 'to contain assets', 'JavaScript', 4);
                expect(assetGraph, 'to contain relations', 'HtmlScript', 3);
                expect(assetGraph, 'to contain relations', 'HtmlSystemJsPolyfill', 1);
            })
            .removeOrPolyfillSystemJs({ mode: 'remove' })
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'HtmlSystemJsPolyfill', 0);
                expect(assetGraph, 'to contain assets', 'JavaScript', 3);
                expect(assetGraph, 'to contain relations', 'HtmlScript', 3);
                expect(assetGraph, 'to contain relations', {type: 'HtmlScript', to: { isInline: true }}, 2);
            })
            .run(done);
    });

    it('should polyfill system.js when instructed to', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/removeOrPolyfillSystemJs/simple/'})
            .registerRequireJsConfig({ preventPopulationOfJavaScriptAssetsUntilConfigHasBeenFound: true })
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Html', 1);
                expect(assetGraph, 'to contain assets', 'JavaScript', 4);
                expect(assetGraph, 'to contain relations', 'HtmlScript', 3);
                expect(assetGraph, 'to contain relations', 'HtmlSystemJsPolyfill', 1);
            })
            .removeOrPolyfillSystemJs({ mode: 'polyfill' })
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'HtmlSystemJsPolyfill', 0);
                expect(assetGraph, 'to contain assets', 'JavaScript', 4);
                expect(assetGraph, 'to contain relations', {type: 'HtmlScript', to: { isInline: true }}, 2);
                expect(assetGraph, 'to contain relations', 'HtmlScript', 4);
            })
            .run(done);
    });

    describe('with a data-systemjs-polyfill attribute that has no value', function () {
        it('should polyfill system.js', function (done) {
            new AssetGraph({root: __dirname + '/../../testdata/transforms/removeOrPolyfillSystemJs/noValue/'})
                .registerRequireJsConfig({ preventPopulationOfJavaScriptAssetsUntilConfigHasBeenFound: true })
                .loadAssets('index.html')
                .populate()
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain assets', 'Html', 1);
                    expect(assetGraph, 'to contain assets', 'JavaScript', 4);
                    expect(assetGraph, 'to contain relations', 'HtmlScript', 3);
                    expect(assetGraph, 'to contain relations', 'HtmlSystemJsPolyfill', 1);
                })
                .removeOrPolyfillSystemJs({ mode: 'polyfill' })
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain relations', 'HtmlSystemJsPolyfill', 0);
                    expect(assetGraph, 'to contain assets', 'JavaScript', 4);
                    expect(assetGraph, 'to contain relations', {type: 'HtmlScript', to: { isInline: true }}, 2);
                    expect(assetGraph, 'to contain relations', 'HtmlScript', 4);
                })
                .run(done);
        });
    });
});
