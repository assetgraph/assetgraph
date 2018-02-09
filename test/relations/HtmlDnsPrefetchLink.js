/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('relations/HtmlDnsPrefetchLink', function () {
    function getHtmlAsset(htmlString) {
        return new AssetGraph({ root: __dirname }).addAsset({
            type: 'Html',
            text: htmlString || '<!doctype html><html><head></head><body></body></html>',
            url: 'file://' + __dirname + 'doesntmatter.html'
        });
    }

    describe('#inline', function () {
        it('should throw', function () {
            const relation = getHtmlAsset().addRelation({
                type: 'HtmlDnsPrefetchLink',
                to: { url: 'index.html' }
            });

            expect(() => relation.inline(), 'to throw', /Inlining of resource hints is not allowed/);
        });
    });

    it('should handle a test case with an existing <link rel="dns-prefetch"> element', async function () {
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/relations/HtmlDnsPrefetchLink/')});
        await assetGraph.loadAssets('index.html');

        expect(assetGraph, 'to contain relation', 'HtmlDnsPrefetchLink');
    });

    it('should update the href', async function () {
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/relations/HtmlDnsPrefetchLink/')});
        await assetGraph.loadAssets('index.html');

        expect(assetGraph, 'to contain relation', 'HtmlDnsPrefetchLink');

        const link = assetGraph.findRelations({ type: 'HtmlDnsPrefetchLink' })[0];
        link.hrefType = 'relative';
        link.to.url = assetGraph.root + 'foo.bar';

        expect(link, 'to satisfy', { href: 'foo.bar' });
    });

    describe('when programmatically adding a relation', function () {
        it('should handle crossorigin url', function () {
            const htmlAsset = getHtmlAsset();
            htmlAsset.addRelation({
                type: 'HtmlDnsPrefetchLink',
                href: 'http://assetgraph.org'
            }, 'firstInHead');

            expect(htmlAsset.parseTree.head.firstChild, 'to exhaustively satisfy', '<link rel="dns-prefetch" href="http://assetgraph.org/">');
        });
    });
});
