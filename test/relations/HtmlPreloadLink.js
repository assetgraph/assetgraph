/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib/AssetGraph');

describe('relations/HtmlPreloadLink', function () {
    function getHtmlAsset(htmlString) {
        var graph = new AssetGraph({ root: __dirname });
        var htmlAsset = new AssetGraph.Html({
            text: htmlString || '<!doctype html><html><head></head><body></body></html>',
            url: 'file://' + __dirname + 'doesntmatter.html'
        });

        graph.addAsset(htmlAsset);

        return htmlAsset;
    }

    it('should handle a test case with an existing <link rel="preload"> element', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlPreloadLink/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relation', 'HtmlPreloadLink');
                expect(assetGraph, 'to contain asset', 'Woff');
            });
    });

    it('should update the href', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlPreloadLink/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relation', 'HtmlPreloadLink');

                var preloadLink = assetGraph.findRelations({ type: 'HtmlPreloadLink' })[0];

                preloadLink.to.url = 'foo.bar';

                expect(preloadLink, 'to satisfy', {
                    href: 'foo.bar'
                });
            });
    });

    describe('when programmatically adding a relation', function () {
        it('should attach a link node in <head>', function () {
            var htmlAsset = getHtmlAsset();
            htmlAsset.addRelation({
                type: 'HtmlPreloadLink',
                to: {
                    type: 'JavaScript',
                    text: '"use strict"',
                    url: 'foo.js'
                }
            }, 'firstInHead');

            expect(htmlAsset.parseTree.head.firstChild, 'to exhaustively satisfy', '<link rel="preload" href="foo.js" as="script" type="application/javascript">');
        });

        it('should set the `as` property passed in the constructor', function () {
            var htmlAsset = getHtmlAsset();
            htmlAsset.addRelation({
                type: 'HtmlPreloadLink',
                to: {
                    type: 'JavaScript',
                    text: '"use strict"',
                    url: 'foo.js'
                },
                as: 'object'
            }, 'firstInHead');

            expect(htmlAsset.parseTree.head.firstChild, 'to exhaustively satisfy', '<link rel="preload" href="foo.js" type="application/javascript" as="object">');
        });

        it('should add the `crossorigin` attribute when the relation is loaded as a font', function () {
            var htmlAsset = getHtmlAsset();
            htmlAsset.addRelation({
                type: 'HtmlPreloadLink',
                to: {
                    type: 'JavaScript',
                    text: '"use strict"',
                    url: 'foo.js'
                },
                as: 'font'
            }, 'firstInHead');

            expect(htmlAsset.parseTree.head.firstChild, 'to exhaustively satisfy', '<link rel="preload" href="foo.js" type="application/javascript" as="font" crossorigin="anonymous">');
        });

        it('should not add the `crossorigin` attribute when the relation is not as a font and the target is not cross origin', function () {
            var htmlAsset = getHtmlAsset();
            htmlAsset.addRelation({
                type: 'HtmlPreloadLink',
                to: {
                    type: 'JavaScript',
                    text: '"use strict"',
                    url: 'foo.js'
                },
                as: 'script'
            }, 'firstInHead');

            expect(htmlAsset.parseTree.head.firstChild, 'to exhaustively satisfy', '<link rel="preload" href="foo.js" type="application/javascript" as="script">');
        });

        it('should add the `crossorigin` attribute when the relation is crossorigin', function () {
            var htmlAsset = getHtmlAsset();
            htmlAsset.addRelation({
                type: 'HtmlPreloadLink',
                to: {
                    type: 'JavaScript',
                    text: '"use strict"',
                    url: 'http://fisk.dk/foo.js'
                },
                as: 'script'
            }, 'firstInHead');

            expect(htmlAsset.parseTree.head.firstChild, 'to exhaustively satisfy', '<link rel="preload" href="http://fisk.dk/foo.js" type="application/javascript" as="script" crossorigin="anonymous">');
        });
    });

    describe('#contentType', function () {
        describe('with unresolved font targets', function () {
            it('should handle woff', function () {
                var relation = new AssetGraph.HtmlPreloadLink({
                    to: { url: 'foo.woff' }
                });

                expect(relation.contentType, 'to be', 'application/font-woff');
            });

            it('should handle woff2', function () {
                var relation = new AssetGraph.HtmlPreloadLink({
                    to: { url: 'foo.woff2' }
                });

                expect(relation.contentType, 'to be', 'font/woff2');
            });

            it('should handle otf', function () {
                var relation = new AssetGraph.HtmlPreloadLink({
                    to: { url: 'foo.otf' }
                });

                expect(relation.contentType, 'to be', 'application/font-sfnt');
            });

            it('should handle ttf', function () {
                var relation = new AssetGraph.HtmlPreloadLink({
                    to: { url: 'foo.ttf' }
                });

                expect(relation.contentType, 'to be', 'application/font-sfnt');
            });

            it('should handle eot', function () {
                var relation = new AssetGraph.HtmlPreloadLink({
                    to: { url: 'foo.eot' }
                });

                expect(relation.contentType, 'to be', 'application/vnd.ms-fontobject');
            });
        });

        describe('with unresolved unknown target', function () {
            it('should return undefined', function () {

                var relation = new AssetGraph.HtmlPreloadLink({
                    to: { url: 'foo.bar' }
                });

                expect(relation.contentType, 'to be', undefined);
            });
        });

        describe('with resolved known targets', function () {
            it('should handle JavaScript', function () {

                var relation = new AssetGraph.HtmlPreloadLink({
                    to: new AssetGraph.JavaScript({ url: 'foo.js' })
                });

                expect(relation.contentType, 'to be', 'application/javascript');
            });

            it('should handle Css', function () {

                var relation = new AssetGraph.HtmlPreloadLink({
                    to: new AssetGraph.Css({ url: 'foo.css' })
                });

                expect(relation.contentType, 'to be', 'text/css');
            });
        });
    });
});
