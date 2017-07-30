/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('relations/HtmlOpenGraph', function () {
    function getHtmlAsset(htmlString) {
        var graph = new AssetGraph({ root: __dirname });
        var htmlAsset = new AssetGraph.Html({
            text: htmlString || '<!doctype html><html><head></head><body></body></html>',
            url: 'file://' + __dirname + 'doesntmatter.html'
        });

        graph.addAsset(htmlAsset);

        return htmlAsset;
    }

    describe('#inline', function () {
        it('should throw', function () {
            var relation = new AssetGraph.HtmlOpenGraph({
                to: { url: 'index.html' }
            });

            expect(relation.inline, 'to throw', /Inlining of open graph relations is not allowed/);
        });
    });

    it('should handle a test case with an existing <link rel="preconnect"> element', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlOpenGraph/'})
            .loadAssets('index.html')
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relation', 'HtmlOpenGraph', 10);
            });
    });

    it('should update the href', async function () {
        const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlOpenGraph/'})
            .loadAssets('index.html');

        expect(assetGraph, 'to contain relation', 'HtmlOpenGraph', 10);

        const link = assetGraph.findRelations({ type: 'HtmlOpenGraph' })[0];

        link.hrefType = 'relative';
        link.to.url = assetGraph.root + 'foo.bar';

        expect(link, 'to satisfy', { href: 'foo.bar' });
    });

    describe('when programmatically adding a relation', function () {
        it('should handle crossorigin url', function () {
            var htmlAsset = getHtmlAsset();
            var relation = new AssetGraph.HtmlOpenGraph({
                to: {
                    url: 'http://assetgraph.org'
                },
                ogProperty: 'og:image'
            });

            relation.attachToHead(htmlAsset, 'first');

            expect(htmlAsset.parseTree.head.firstChild, 'to exhaustively satisfy', '<meta property="og:image" content="http://assetgraph.org/">');
        });
    });
});
