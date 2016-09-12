/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/HtmlDnsPrefetchLink', function () {
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
            var relation = new AssetGraph.HtmlDnsPrefetchLink({
                to: { url: 'index.html' }
            });

            expect(relation.inline, 'to throw', /Inlining of resource hints is not allowed/);
        });
    });

    it('should handle a test case with an existing <link rel="dns-prefetch"> element', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlDnsPrefetchLink/'})
            .loadAssets('index.html')
            .populate({ followRelations: { crossorigin: false } })
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relation', 'HtmlDnsPrefetchLink');
            });
    });

    it('should update the href', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlDnsPrefetchLink/'})
            .loadAssets('index.html')
            .populate({ followRelations: { crossorigin: false } })
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relation', 'HtmlDnsPrefetchLink');

                var link = assetGraph.findRelations({ type: 'HtmlDnsPrefetchLink' })[0];

                link.to.url = 'foo.bar';

                expect(link, 'to satisfy', {
                    href: 'foo.bar'
                });
            });
    });

    describe('when programmatically adding a relation', function () {
        it('should handle crossorigin url', function () {
            var htmlAsset = getHtmlAsset();
            var relation = new AssetGraph.HtmlDnsPrefetchLink({
                to: {
                    url: 'http://assetgraph.org'
                }
            });

            relation.attachToHead(htmlAsset, 'first');

            expect(htmlAsset.parseTree.head.firstChild, 'to exhaustively satisfy', '<link rel="dns-prefetch" href="http://assetgraph.org">');
        });
    });
});
