/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    urlTools = require('urltools'),
    AssetGraph = require('../../lib');

describe('transforms/convertCssImportsToHtmlStyles', function () {
    it('should converting Css @import rules to <link rel="stylesheet">', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/convertCssImportsToHtmlStyles/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Html');
                expect(assetGraph, 'to contain asset', 'Png');
                expect(assetGraph, 'to contain assets', 'Css', 4);
                expect(assetGraph, 'to contain relations', 'CssImport', 3);
                expect(assetGraph, 'to contain relation', {type: 'CssImport', hrefType: 'rootRelative'});
            })
            .convertCssImportsToHtmlStyles({type: 'Html'})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Css', 4);
                expect(assetGraph, 'to contain relations', 'HtmlStyle', 4);
                expect(assetGraph, 'to contain relation', {type: 'HtmlStyle', hrefType: 'rootRelative'});
                expect(assetGraph, 'to contain no relations', {type: 'CssImport'});
                expect(assetGraph.findRelations({type: 'HtmlStyle', to: {url: /\/foo2\.css$/}})[0].node.getAttribute('media'), 'to equal', 'print');

                expect(
                    assetGraph.findAssets({type: 'Html'})[0].text.match(/href=\"([^\'\"]+)\"/g),
                    'to equal',
                     ['href="foo2.css"', 'href="foo.css"', 'href="/bar.css"']
                );
            })
            .bundleRelations({type: 'HtmlStyle'})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'HtmlStyle', 2);
                expect(assetGraph.findRelations({type: 'HtmlStyle'})[0].node.getAttribute('media'), 'to equal', 'print');
                expect(assetGraph.findRelations({type: 'HtmlStyle'})[1].node.hasAttribute('media'), 'to be false');
                expect(assetGraph, 'to contain assets', 'Css', 2);

                var cssAsset = assetGraph.findAssets({type: 'Css'})[0];
                expect(cssAsset.parseTree.cssRules, 'to have length', 1);
                expect(cssAsset.parseTree.cssRules[0].style['background-color'], 'to equal', 'maroon');

                cssAsset = assetGraph.findAssets({type: 'Css'})[1];
                expect(cssAsset.parseTree.cssRules, 'to have length', 3);
                expect(cssAsset.parseTree.cssRules[0].style.color, 'to equal', 'teal');
                expect(cssAsset.parseTree.cssRules[1].style.color, 'to equal', 'tan');
                expect(cssAsset.parseTree.cssRules[2].style.color, 'to equal', 'blue');


                assetGraph.findAssets({type: 'Html'})[0].url = urlTools.resolveUrl(assetGraph.root, 'subdir/index2.html');
                expect(assetGraph.findRelations({type: 'CssAlphaImageLoader'})[0].href, 'to equal', '../foo.png');
            })
            .run(done);
    });
});
