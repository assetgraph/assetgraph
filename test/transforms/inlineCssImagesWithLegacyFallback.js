/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('transforms/inlineCssImagesWithLegacyFallback', function () {
    it('should handle a test case with a single Html asset', async function () {
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/inlineCssImagesWithLegacyFallback/combo/')});
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();

        expect(assetGraph, 'to contain assets', 'Css', 5);
        expect(assetGraph, 'to contain assets', {isImage: true}, 6);

        await assetGraph.inlineCssImagesWithLegacyFallback({isInitial: true}, {sizeThreshold: 32768 * 3 / 4});

        expect(assetGraph, 'to contain assets', 'Css', 7);

        // the ?inline=false parameter should be removed from the urls in the css assets:
        expect(assetGraph.findAssets({fileName: 'smallImagesWithInlineFalse.css'})[0].text, 'not to match', /inline=false/);
        expect(assetGraph.findAssets({fileName: 'imageGreaterThan32KBWithInlineParameter.css'})[0].text, 'not to match', /inline/);

        expect(assetGraph, 'to contain relations', 'HtmlConditionalComment', 7);
        expect(assetGraph, 'to contain relations', {type: 'CssImage', to: {isInline: true}}, 3);

        expect(assetGraph.findAssets({type: 'Html'})[0].text.match(/<link[^>]*>/g), 'to have length', 7);

        expect(assetGraph.findAssets({type: 'Html'})[0].text.match(/<!--\[if !IE\]>-->/g), 'to have length', 3);

        expect(assetGraph.findAssets({type: 'Html'})[0].text.match(/media=['"]handheld/g), 'to have length', 2);

        expect(assetGraph.findAssets({type: 'Html'})[0].text.match(/media=['"]screen/g), 'to have length', 1);

        const text = assetGraph.findAssets({type: 'Html'})[0].text;
        expect(text, 'to match', /<!--\[if gte IE 8\]><!--><link[^>]*><!--<!\[endif\]-->/);
        expect(text.match(/<!--\[if lt IE 8\]><link[^>]*><!\[endif\]-->/g), 'to have length', 1);

        expect(text, 'to match', /<!--\[if gte IE 9\]><!--><link[^>]*><!--<!\[endif\]-->/);
        expect(text.match(/<!--\[if lt IE 9\]><link[^>]*><!\[endif\]-->/g), 'to have length', 1);
    });

    it('should not create the fallback stylesheet if a minimumIeVersion of 9 is specified', async function () {
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/inlineCssImagesWithLegacyFallback/combo/')});

        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();

        expect(assetGraph, 'to contain assets', 'Css', 5);
        expect(assetGraph, 'to contain assets', {isImage: true}, 6);

        await assetGraph.inlineCssImagesWithLegacyFallback({isInitial: true}, {
            minimumIeVersion: 9,
            sizeThreshold: 32768 * 3 / 4
        });

        expect(assetGraph, 'to contain assets', 'Css', 5);
        expect(assetGraph, 'to contain relations', {type: 'CssImage', to: {isInline: true}}, 3);
    });

    it('should handle a test case with multiple Html asset that point at the same Css', async function () {
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/inlineCssImagesWithLegacyFallback/multipleHtmls/')});
        await assetGraph.loadAssets('*.html');
        await assetGraph.populate();

        expect(assetGraph, 'to contain assets', 'Html', 2);
        expect(assetGraph, 'to contain asset', 'Css');
        expect(assetGraph, 'to contain asset', {isImage: true});

        await assetGraph.inlineCssImagesWithLegacyFallback({isInitial: true}, {sizeThreshold: 32768 * 3 / 4});

        expect(assetGraph, 'to contain assets', 'Css', 3);
        expect(assetGraph, 'to contain relations', 'HtmlConditionalComment', 2);
        expect(assetGraph, 'to contain relations', {type: 'CssImage', to: {isInline: true}}, 2);

        expect(assetGraph.findAssets({type: 'Html', fileName: '1.html'})[0].text.match(/<link[^>]*>/g), 'to have length', 2);

        expect(assetGraph.findAssets({type: 'Html', fileName: '2.html'})[0].text.match(/<link[^>]*>/g), 'to have length', 2);

        assetGraph.findAssets({type: 'Html', isInline: false}).forEach(function (htmlAsset) {
            expect(htmlAsset.text.match(/<!--\[if gte IE 8\]><!-->/g), 'to have length', 1);
        });
    });

    it('should handle a test case with a root-relative HtmlStyle relation', async function () {
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/inlineCssImagesWithLegacyFallback/rootRelative/')});
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();
        await assetGraph.inlineCssImagesWithLegacyFallback({isInitial: true}, {sizeThreshold: 32768 * 3 / 4});

        expect(assetGraph, 'to contain relations', 'HtmlStyle', 2);
        expect(assetGraph, 'to contain relations', {type: 'HtmlStyle', hrefType: 'rootRelative'}, 2);
    });

    it('should handle a test case with a small background-image inside a @media query', async function () {
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/transforms/inlineCssImagesWithLegacyFallback/mediaQuery/')});
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();
        await assetGraph.inlineCssImagesWithLegacyFallback({isInitial: true}, {sizeThreshold: 10000});

        expect(assetGraph, 'to contain relation', {type: 'CssImage', to: {isInline: false}});
        expect(assetGraph, 'to contain no relations', {type: 'CssImage', to: {isInline: true}});
    });
});
