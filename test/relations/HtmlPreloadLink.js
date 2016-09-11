/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

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
                expect(assetGraph, 'to contain asset', 'Asset');
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
            var relation = new AssetGraph.HtmlPreloadLink({
                to: new AssetGraph.JavaScript({ text: '"use strict"', url: 'foo.js' })
            });

            relation.attachToHead(htmlAsset, 'first');

            expect(htmlAsset.parseTree.head.firstChild, 'to exhaustively satisfy', '<link rel="preload" href="foo.js" as="script" type="application/javascript">');
        });

        it('should set the `as` property passed in the constructor', function () {
            var htmlAsset = getHtmlAsset();
            var relation = new AssetGraph.HtmlPreloadLink({
                to: new AssetGraph.JavaScript({ text: '"use strict"', url: 'foo.js' }),
                as: 'object'
            });

            relation.attachToHead(htmlAsset, 'first');

            expect(htmlAsset.parseTree.head.firstChild, 'to exhaustively satisfy', '<link rel="preload" href="foo.js" type="application/javascript" as="object">');
        });

        it('should add the `crossorigin` attribute when the relation is loaded as a font', function () {
            var htmlAsset = getHtmlAsset();
            var relation = new AssetGraph.HtmlPreloadLink({
                to: new AssetGraph.JavaScript({ text: '"use strict"', url: 'foo.js' }),
                as: 'font'
            });

            relation.attachToHead(htmlAsset, 'first');

            expect(htmlAsset.parseTree.head.firstChild, 'to exhaustively satisfy', '<link rel="preload" href="foo.js" type="application/javascript" as="font" crossorigin="crossorigin">');
        });

        it('should add the `crossorigin` attribute when the relation is crossorigin', function () {
            var htmlAsset = getHtmlAsset();
            var relation = new AssetGraph.HtmlPreloadLink({
                to: new AssetGraph.JavaScript({ text: '"use strict"', url: 'http://fisk.dk/foo.js' }),
                as: 'script'
            });

            relation.attachToHead(htmlAsset, 'first');

            expect(htmlAsset.parseTree.head.firstChild, 'to exhaustively satisfy', '<link rel="preload" href="http://fisk.dk/foo.js" type="application/javascript" as="script" crossorigin="crossorigin">');
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

        describe('with resolved knwon targets', function () {
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

    describe('#as', function () {
        describe('when target asset is not resolved', function () {
            it('should detect css as style', function () {
                var relation = new AssetGraph.HtmlPreloadLink({
                    to: { url: 'foo.css' }
                });

                expect(relation.as, 'to be', 'style');
            });

            it('should detect js as script', function () {
                var relation = new AssetGraph.HtmlPreloadLink({
                    to: { url: 'foo.js' }
                });

                expect(relation.as, 'to be', 'script');
            });

            it('should detect svg as image', function () {
                var relation = new AssetGraph.HtmlPreloadLink({
                    to: { url: 'foo.svg' }
                });

                expect(relation.as, 'to be', 'image');
            });

            it('should detect jpg as image', function () {
                var relation = new AssetGraph.HtmlPreloadLink({
                    to: { url: 'foo.jpg' }
                });

                expect(relation.as, 'to be', 'image');
            });

            it('should detect jpeg as image', function () {
                var relation = new AssetGraph.HtmlPreloadLink({
                    to: { url: 'foo.jpeg' }
                });

                expect(relation.as, 'to be', 'image');
            });

            it('should detect png as image', function () {
                var relation = new AssetGraph.HtmlPreloadLink({
                    to: { url: 'foo.png' }
                });

                expect(relation.as, 'to be', 'image');
            });

            it('should detect gif as image', function () {
                var relation = new AssetGraph.HtmlPreloadLink({
                    to: { url: 'foo.gif' }
                });

                expect(relation.as, 'to be', 'image');
            });

            it('should detect webp as image', function () {
                var relation = new AssetGraph.HtmlPreloadLink({
                    to: { url: 'foo.webp' }
                });

                expect(relation.as, 'to be', 'image');
            });

            it('should detect ico as image', function () {
                var relation = new AssetGraph.HtmlPreloadLink({
                    to: { url: 'foo.ico' }
                });

                expect(relation.as, 'to be', 'image');
            });

            it('should detect tiff as image', function () {
                var relation = new AssetGraph.HtmlPreloadLink({
                    to: { url: 'foo.tiff' }
                });

                expect(relation.as, 'to be', 'image');
            });

            it('should detect bmp as image', function () {
                var relation = new AssetGraph.HtmlPreloadLink({
                    to: { url: 'foo.bmp' }
                });

                expect(relation.as, 'to be', 'image');
            });

            it('should detect html as document', function () {
                var relation = new AssetGraph.HtmlPreloadLink({
                    to: { url: 'foo.html' }
                });

                expect(relation.as, 'to be', 'document');
            });

            it('should detect woff as font', function () {
                var relation = new AssetGraph.HtmlPreloadLink({
                    to: { url: 'foo.woff' }
                });

                expect(relation.as, 'to be', 'font');
            });

            it('should detect woff2 as font', function () {
                var relation = new AssetGraph.HtmlPreloadLink({
                    to: { url: 'foo.woff2' }
                });

                expect(relation.as, 'to be', 'font');
            });

            it('should detect ttf as font', function () {
                var relation = new AssetGraph.HtmlPreloadLink({
                    to: { url: 'foo.ttf' }
                });

                expect(relation.as, 'to be', 'font');
            });

            it('should detect eot as font', function () {
                var relation = new AssetGraph.HtmlPreloadLink({
                    to: { url: 'foo.eot' }
                });

                expect(relation.as, 'to be', 'font');
            });

            it('should detect otf as font', function () {
                var relation = new AssetGraph.HtmlPreloadLink({
                    to: { url: 'foo.otf' }
                });

                expect(relation.as, 'to be', 'font');
            });

            it('should fall back to an empty string', function () {
                var relation = new AssetGraph.HtmlPreloadLink({
                    to: { url: 'foo' }
                });

                expect(relation.as, 'to be', '');
            });
        });

        describe('when target asset is resolved', function () {
            it('should handle images', function () {
                var htmlAsset = getHtmlAsset('<body><img src="foo.png"></body>');

                return htmlAsset.assetGraph
                    .populate()
                    .queue(function (assetGraph) {
                        var relation = new AssetGraph.HtmlPreloadLink({
                            to: assetGraph.findAssets()[1]
                        });

                        expect(relation.as, 'to be', 'image');
                    });
            });

            it('should handle script', function () {
                var htmlAsset = getHtmlAsset('<body><script src="foo.js"></script></body>');

                return htmlAsset.assetGraph
                    .populate()
                    .queue(function (assetGraph) {
                        var relation = new AssetGraph.HtmlPreloadLink({
                            to: assetGraph.findAssets()[1]
                        });

                        expect(relation.as, 'to be', 'script');
                    });
            });

            it('should handle style', function () {
                var htmlAsset = getHtmlAsset('<body><link rel="stylesheet" href="foo.css"></body>');

                return htmlAsset.assetGraph
                    .populate()
                    .queue(function (assetGraph) {
                        var relation = new AssetGraph.HtmlPreloadLink({
                            to: assetGraph.findAssets()[1]
                        });

                        expect(relation.as, 'to be', 'style');
                    });
            });

            it('should handle style with unknown file extension', function () {
                var htmlAsset = getHtmlAsset('<body><link rel="stylesheet" href="foo.scss"></body>');

                return htmlAsset.assetGraph
                    .populate()
                    .queue(function (assetGraph) {
                        var relation = new AssetGraph.HtmlPreloadLink({
                            to: assetGraph.findAssets()[1]
                        });

                        expect(relation.as, 'to be', 'style');
                    });
            });

            it('should handle an iframe', function () {
                var htmlAsset = getHtmlAsset('<body><iframe src="foo.html"></iframe></body>');

                return htmlAsset.assetGraph
                    .populate()
                    .queue(function (assetGraph) {
                        var relation = new AssetGraph.HtmlPreloadLink({
                            to: assetGraph.findAssets()[1]
                        });

                        expect(relation.as, 'to be', 'document');
                    });
            });

            it.skip('should handle a frame', function () {
                var htmlAsset = getHtmlAsset('<body><frameset><frame src="foo.html"></frameset></body>');

                return htmlAsset.assetGraph
                    .populate()
                    .queue(function (assetGraph) {
                        var relation = new AssetGraph.HtmlPreloadLink({
                            to: assetGraph.findAssets()[1]
                        });

                        expect(relation.as, 'to be', 'document');
                    });
            });

            it('should handle audio', function () {
                var htmlAsset = getHtmlAsset('<body><audio src="foo.wav"></body>');

                return htmlAsset.assetGraph
                    .populate()
                    .queue(function (assetGraph) {
                        var relation = new AssetGraph.HtmlPreloadLink({
                            to: assetGraph.findAssets()[1]
                        });

                        expect(relation.as, 'to be', 'media');
                    });
            });

            it('should handle video', function () {
                var htmlAsset = getHtmlAsset('<body><video src="foo.wav"></body>');

                return htmlAsset.assetGraph
                    .populate()
                    .queue(function (assetGraph) {
                        var relation = new AssetGraph.HtmlPreloadLink({
                            to: assetGraph.findAssets()[1]
                        });

                        expect(relation.as, 'to be', 'media');
                    });
            });

            it('should handle css fonts', function () {
                var htmlAsset = getHtmlAsset('<body><style>@font-face { font-family: "Noto Serif"; font-style: normal; font-weight: 400; src: url(foo.woff2) format("woff2"); }</style></body>');

                return htmlAsset.assetGraph
                    .populate()
                    .queue(function (assetGraph) {
                        var relation = new AssetGraph.HtmlPreloadLink({
                            to: assetGraph.findAssets()[2]
                        });

                        expect(relation.as, 'to be', 'font');
                    });
            });

            it('should handle embeds', function () {
                var htmlAsset = getHtmlAsset('<body><embed src="foo.wav"></body>');

                return htmlAsset.assetGraph
                    .populate()
                    .queue(function (assetGraph) {
                        var relation = new AssetGraph.HtmlPreloadLink({
                            to: assetGraph.findAssets()[1]
                        });

                        expect(relation.as, 'to be', 'embed');
                    });
            });

            it('should handle objects', function () {
                var htmlAsset = getHtmlAsset('<body><object data="foo.wav"></object></body>');

                return htmlAsset.assetGraph
                    .populate()
                    .queue(function (assetGraph) {
                        var relation = new AssetGraph.HtmlPreloadLink({
                            to: assetGraph.findAssets()[1]
                        });

                        expect(relation.as, 'to be', 'object');
                    });
            });
        });
    });
});
