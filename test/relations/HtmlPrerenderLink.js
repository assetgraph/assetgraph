/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/HtmlPrerenderLink', function () {
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
            var relation = new AssetGraph.HtmlPrerenderLink({
                to: { url: 'index.html' }
            });

            expect(relation.inline, 'to throw', /Inlining of resource hints is not allowed/);
        });
    });

    it('should handle a test case with an existing <link rel="prerender"> element', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlPrerenderLink/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relation', 'HtmlPrerenderLink');
                expect(assetGraph, 'to contain assets', 'Html', 2);
            });
    });

    it('should update the href', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlPrerenderLink/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relation', 'HtmlPrerenderLink');

                var prerenderLink = assetGraph.findRelations({ type: 'HtmlPrerenderLink' })[0];

                prerenderLink.to.url = 'foo.bar';

                expect(prerenderLink, 'to satisfy', {
                    href: 'foo.bar'
                });
            });
    });

    describe('when programmatically adding a relation', function () {
        it('should attach a link node in <head>', function () {
            var htmlAsset = getHtmlAsset();
            var relation = new AssetGraph.HtmlPrerenderLink({
                to: new AssetGraph.Html({ text: '<!doctype html><html><head></head><body></body></html>', url: 'index.html' })
            });

            relation.attachToHead(htmlAsset, 'first');

            expect(htmlAsset.parseTree.head.firstChild, 'to exhaustively satisfy', '<link rel="prerender" href="index.html">');
        });

        it('should handle crossorigin url the same', function () {
            var htmlAsset = getHtmlAsset();
            var relation = new AssetGraph.HtmlPrerenderLink({
                to: new AssetGraph.Html({ text: '<!doctype html><html><head></head><body></body></html>', url: 'http://fisk.dk/index.html' }),
                as: 'script'
            });

            relation.attachToHead(htmlAsset, 'first');

            expect(htmlAsset.parseTree.head.firstChild, 'to exhaustively satisfy', '<link rel="prerender" href="http://fisk.dk/index.html">');
        });
    });
});
