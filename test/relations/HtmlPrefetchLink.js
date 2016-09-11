/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/HtmlPrefetchLink', function () {
    function getHtmlAsset(htmlString) {
        var graph = new AssetGraph({ root: __dirname });
        var htmlAsset = new AssetGraph.Html({
            text: htmlString || '<!doctype html><html><head></head><body></body></html>',
            url: 'file://' + __dirname + 'doesntmatter.html'
        });

        graph.addAsset(htmlAsset);

        return htmlAsset;
    }

    it('should handle a test case with an existing <link rel="prefetch"> element', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlPrefetchLink/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relation', 'HtmlPrefetchLink');
                expect(assetGraph, 'to contain asset', 'Asset');
            });
    });

    it('should update the href', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlPrefetchLink/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relation', 'HtmlPrefetchLink');

                var prefetchLink = assetGraph.findRelations({ type: 'HtmlPrefetchLink' })[0];

                prefetchLink.to.url = 'foo.bar';

                expect(prefetchLink, 'to satisfy', {
                    href: 'foo.bar'
                });
            });
    });

    describe('when programmatically adding a relation', function () {
        it('should attach a link node in <head>', function () {
            var htmlAsset = getHtmlAsset();
            var relation = new AssetGraph.HtmlPrefetchLink({
                to: new AssetGraph.JavaScript({ text: '"use strict"', url: 'foo.js' })
            });

            relation.attachToHead(htmlAsset, 'first');

            expect(htmlAsset.parseTree.head.firstChild, 'to exhaustively satisfy', '<link rel="prefetch" href="foo.js" as="script">');
        });

        it('should set the `as` property passed in the constructor', function () {
            var htmlAsset = getHtmlAsset();
            var relation = new AssetGraph.HtmlPrefetchLink({
                to: new AssetGraph.JavaScript({ text: '"use strict"', url: 'foo.js' }),
                as: 'object'
            });

            relation.attachToHead(htmlAsset, 'first');

            expect(htmlAsset.parseTree.head.firstChild, 'to exhaustively satisfy', '<link rel="prefetch" href="foo.js" as="object">');
        });

        it('should add the `crossorigin` attribute when the relation is loaded as a font', function () {
            var htmlAsset = getHtmlAsset();
            var relation = new AssetGraph.HtmlPrefetchLink({
                to: new AssetGraph.JavaScript({ text: '"use strict"', url: 'foo.js' }),
                as: 'font'
            });

            relation.attachToHead(htmlAsset, 'first');

            expect(htmlAsset.parseTree.head.firstChild, 'to exhaustively satisfy', '<link rel="prefetch" href="foo.js" as="font">');
        });

        it('should add the `crossorigin` attribute when the relation is crossorigin', function () {
            var htmlAsset = getHtmlAsset();
            var relation = new AssetGraph.HtmlPrefetchLink({
                to: new AssetGraph.JavaScript({ text: '"use strict"', url: 'http://fisk.dk/foo.js' }),
                as: 'script'
            });

            relation.attachToHead(htmlAsset, 'first');

            expect(htmlAsset.parseTree.head.firstChild, 'to exhaustively satisfy', '<link rel="prefetch" href="http://fisk.dk/foo.js" as="script">');
        });
    });
});
