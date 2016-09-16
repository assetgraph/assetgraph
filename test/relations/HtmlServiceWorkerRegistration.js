/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/HtmlServiceWorkerRegistration', function () {
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
            var relation = new AssetGraph.HtmlServiceWorkerRegistration({
                to: { url: 'index.html' }
            });

            expect(relation.inline, 'to throw', /Inlining of service worker relations is not allowed/);
        });
    });

    it('should handle a test case with an existing <link rel="serviceworker"> element', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlServiceWorkerRegistration/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relation', 'HtmlServiceWorkerRegistration');
                expect(assetGraph, 'to contain asset', 'JavaScript');
            });
    });

    it('should update the href', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlServiceWorkerRegistration/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relation', 'HtmlServiceWorkerRegistration');

                var link = assetGraph.findRelations({ type: 'HtmlServiceWorkerRegistration' })[0];

                link.to.url = 'foo.bar';

                expect(link, 'to satisfy', {
                    href: 'foo.bar'
                });
            });
    });

    describe('when programmatically adding a relation', function () {
        it('should attach to <head>', function () {
            var htmlAsset = getHtmlAsset();
            var relation = new AssetGraph.HtmlServiceWorkerRegistration({
                to: {
                    url: 'sw.js'
                }
            });

            relation.attachToHead(htmlAsset, 'first');

            expect(relation.node, 'to exhaustively satisfy', '<link rel="serviceworker" href="sw.js">');
        });

        it('should add a scope attribute', function () {
            var htmlAsset = getHtmlAsset();
            var relation = new AssetGraph.HtmlServiceWorkerRegistration({
                to: {
                    url: 'sw.js'
                },
                scope: '/'
            });

            relation.attachToHead(htmlAsset, 'first');

            expect(relation.node, 'to exhaustively satisfy', '<link rel="serviceworker" href="sw.js" scope="/">');
        });
    });
});
