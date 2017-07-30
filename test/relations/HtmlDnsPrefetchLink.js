/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('relations/HtmlDnsPrefetchLink', function () {
    function getHtmlAsset(htmlString) {
        const graph = new AssetGraph({ root: __dirname });
        const htmlAsset = new AssetGraph.Html({
            text: htmlString || '<!doctype html><html><head></head><body></body></html>',
            url: 'file://' + __dirname + 'doesntmatter.html'
        });

        graph.addAsset(htmlAsset);

        return htmlAsset;
    }

    describe('#inline', function () {
        it('should throw', function () {
            const relation = new AssetGraph.HtmlDnsPrefetchLink({
                to: { url: 'index.html' }
            });

            expect(relation.inline, 'to throw', /Inlining of resource hints is not allowed/);
        });
    });

    it('should handle a test case with an existing <link rel="dns-prefetch"> element', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlDnsPrefetchLink/'})
            .loadAssets('index.html')
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relation including unresolved', 'HtmlDnsPrefetchLink');
            });
    });

    it('should update the href', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlDnsPrefetchLink/'})
            .loadAssets('index.html')
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relation', 'HtmlDnsPrefetchLink');

                const link = assetGraph.findRelations({ type: 'HtmlDnsPrefetchLink' }, true)[0];
                link.hrefType = 'relative';
                link.to.url = assetGraph.root + 'foo.bar';

                expect(link, 'to satisfy', { href: 'foo.bar' });
            });
    });

    describe('when programmatically adding a relation', function () {
        it('should handle crossorigin url', function () {
            const htmlAsset = getHtmlAsset();
            const relation = new AssetGraph.HtmlDnsPrefetchLink({
                to: { url: 'http://assetgraph.org' }
            });

            relation.attachToHead(htmlAsset, 'first');

            expect(htmlAsset.parseTree.head.firstChild, 'to exhaustively satisfy', '<link rel="dns-prefetch" href="http://assetgraph.org/">');
        });
    });
});
