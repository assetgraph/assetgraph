/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('transforms/inlineCssImagesWithLegacyFallback', function () {
    it('should handle a test case with a single Html asset', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/inlineCssImagesWithLegacyFallback/combo/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Css', 5);
                expect(assetGraph, 'to contain assets', {isImage: true}, 6);
            })
            .inlineCssImagesWithLegacyFallback({isInitial: true}, {sizeThreshold: 32768 * 3 / 4})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Css', 7);

                // the ?inline=false parameter should be removed from the urls in the css assets:
                expect(assetGraph.findAssets({url: /\/smallImagesWithInlineFalse\.css$/})[0].text, 'not to match', /inline=false/);
                expect(assetGraph.findAssets({url: /\/imageGreaterThan32KBWithInlineParameter\.css$/})[0].text, 'not to match', /inline/);

                expect(assetGraph, 'to contain relations', 'HtmlConditionalComment', 7);
                expect(assetGraph, 'to contain relations', {type: 'CssImage', to: {isInline: true}}, 3);

                expect(assetGraph.findAssets({type: 'Html'})[0].text.match(/<link[^>]*>/g), 'to have length', 7);

                expect(assetGraph.findAssets({type: 'Html'})[0].text.match(/<!--\[if !IE\]>-->/g), 'to have length', 3);

                expect(assetGraph.findAssets({type: 'Html'})[0].text.match(/media=['"]handheld/g), 'to have length', 2);

                expect(assetGraph.findAssets({type: 'Html'})[0].text.match(/media=['"]screen/g), 'to have length', 1);

                var text = assetGraph.findAssets({type: 'Html'})[0].text;
                expect(text, 'to match', /<!--\[if gte IE 8\]><!--><link[^>]*><!--<!\[endif\]-->/);
                expect(text.match(/<!--\[if lt IE 8\]><link[^>]*><!\[endif\]-->/g), 'to have length', 1);

                expect(text, 'to match', /<!--\[if gte IE 9\]><!--><link[^>]*><!--<!\[endif\]-->/);
                expect(text.match(/<!--\[if lt IE 9\]><link[^>]*><!\[endif\]-->/g), 'to have length', 1);
            })
            .run(done);
    });

    it('should not create the fallback stylesheet if a minimumIeVersion of 9 is specified', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/inlineCssImagesWithLegacyFallback/combo/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Css', 5);
                expect(assetGraph, 'to contain assets', {isImage: true}, 6);
            })
            .inlineCssImagesWithLegacyFallback({isInitial: true}, {
                minimumIeVersion: 9,
                sizeThreshold: 32768 * 3 / 4
            })
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Css', 5);
                expect(assetGraph, 'to contain relations', {type: 'CssImage', to: {isInline: true}}, 3);
            })
            .run(done);
    });

    it('should handle a test case with multiple Html asset that point at the same Css', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/inlineCssImagesWithLegacyFallback/multipleHtmls/'})
            .loadAssets('*.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Html', 2);
                expect(assetGraph, 'to contain asset', 'Css');
                expect(assetGraph, 'to contain asset', {isImage: true});
            })
            .inlineCssImagesWithLegacyFallback({isInitial: true}, {sizeThreshold: 32768 * 3/4})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Css', 3);
                expect(assetGraph, 'to contain relations', 'HtmlConditionalComment', 2);
                expect(assetGraph, 'to contain relations', {type: 'CssImage', to: {isInline: true}}, 2);

                expect(assetGraph.findAssets({type: 'Html', url: /\/1.html$/})[0].text.match(/<link[^>]*>/g), 'to have length', 2);

                expect(assetGraph.findAssets({type: 'Html', url: /\/2.html$/})[0].text.match(/<link[^>]*>/g), 'to have length', 2);

                assetGraph.findAssets({type: 'Html', isInline: false}).forEach(function (htmlAsset) {
                    expect(htmlAsset.text.match(/<!--\[if gte IE 8\]><!-->/g), 'to have length', 1);
                });
            })
            .run(done);
    });

    it('should handle a test case with a root-relative HtmlStyle relation', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/inlineCssImagesWithLegacyFallback/rootRelative/'})
            .loadAssets('index.html')
            .populate()
            .inlineCssImagesWithLegacyFallback({isInitial: true}, {sizeThreshold: 32768 * 3/4})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'HtmlStyle', 2);
                expect(assetGraph, 'to contain relations', {type: 'HtmlStyle', hrefType: 'rootRelative'}, 2);
            })
            .run(done);
    });

    it('should handle a test case with a small background-image inside a @media query', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/inlineCssImagesWithLegacyFallback/mediaQuery/'})
            .loadAssets('index.html')
            .populate()
            .inlineCssImagesWithLegacyFallback({isInitial: true}, {sizeThreshold: 10000})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relation', {type: 'CssImage', to: {isInline: false}});
                expect(assetGraph, 'to contain no relations', {type: 'CssImage', to: {isInline: true}});
            })
            .run(done);
    });
});
