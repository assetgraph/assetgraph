/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');
const sinon = require('sinon');

describe('relations/HtmlResourceHint', function () {
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
            var relation = new AssetGraph.HtmlResourceHint({
                to: { url: 'foo.css' }
            });

            expect(relation.inline, 'to throw', /Inlining of resource hints is not allowed/);
        });
    });

    describe('#as', function () {
        describe('when target asset is not resolved', function () {
            it('should detect css as style', function () {
                var relation = new AssetGraph.HtmlResourceHint({
                    to: { url: 'foo.css' }
                });

                expect(relation.as, 'to be', 'style');
            });

            it('should detect js as script', function () {
                var relation = new AssetGraph.HtmlResourceHint({
                    to: { url: 'foo.js' }
                });

                expect(relation.as, 'to be', 'script');
            });

            it('should detect svg as image', function () {
                var relation = new AssetGraph.HtmlResourceHint({
                    to: { url: 'foo.svg' }
                });

                expect(relation.as, 'to be', 'image');
            });

            it('should detect jpg as image', function () {
                var relation = new AssetGraph.HtmlResourceHint({
                    to: { url: 'foo.jpg' }
                });

                expect(relation.as, 'to be', 'image');
            });

            it('should detect jpeg as image', function () {
                var relation = new AssetGraph.HtmlResourceHint({
                    to: { url: 'foo.jpeg' }
                });

                expect(relation.as, 'to be', 'image');
            });

            it('should detect png as image', function () {
                var relation = new AssetGraph.HtmlResourceHint({
                    to: { url: 'foo.png' }
                });

                expect(relation.as, 'to be', 'image');
            });

            it('should detect gif as image', function () {
                var relation = new AssetGraph.HtmlResourceHint({
                    to: { url: 'foo.gif' }
                });

                expect(relation.as, 'to be', 'image');
            });

            it('should detect webp as image', function () {
                var relation = new AssetGraph.HtmlResourceHint({
                    to: { url: 'foo.webp' }
                });

                expect(relation.as, 'to be', 'image');
            });

            it('should detect ico as image', function () {
                var relation = new AssetGraph.HtmlResourceHint({
                    to: { url: 'foo.ico' }
                });

                expect(relation.as, 'to be', 'image');
            });

            it('should detect tiff as image', function () {
                var relation = new AssetGraph.HtmlResourceHint({
                    to: { url: 'foo.tiff' }
                });

                expect(relation.as, 'to be', 'image');
            });

            it('should detect bmp as image', function () {
                var relation = new AssetGraph.HtmlResourceHint({
                    to: { url: 'foo.bmp' }
                });

                expect(relation.as, 'to be', 'image');
            });

            it('should detect html as document', function () {
                var relation = new AssetGraph.HtmlResourceHint({
                    to: { url: 'foo.html' }
                });

                expect(relation.as, 'to be', 'document');
            });

            it('should detect woff as font', function () {
                var relation = new AssetGraph.HtmlResourceHint({
                    to: { url: 'foo.woff' }
                });

                expect(relation.as, 'to be', 'font');
            });

            it('should detect woff2 as font', function () {
                var relation = new AssetGraph.HtmlResourceHint({
                    to: { url: 'foo.woff2' }
                });

                expect(relation.as, 'to be', 'font');
            });

            it('should detect ttf as font', function () {
                var relation = new AssetGraph.HtmlResourceHint({
                    to: { url: 'foo.ttf' }
                });

                expect(relation.as, 'to be', 'font');
            });

            it('should detect eot as font', function () {
                var relation = new AssetGraph.HtmlResourceHint({
                    to: { url: 'foo.eot' }
                });

                expect(relation.as, 'to be', 'font');
            });

            it('should detect otf as font', function () {
                var relation = new AssetGraph.HtmlResourceHint({
                    to: { url: 'foo.otf' }
                });

                expect(relation.as, 'to be', 'font');
            });

            it('should fall back to an empty string', function () {
                var relation = new AssetGraph.HtmlResourceHint({
                    to: { url: 'foo' }
                });

                expect(relation.as, 'to be', '');
            });
        });

        describe('when target asset is resolved', function () {
            it('should handle images', async function () {
                const warnSpy = sinon.spy().named('warn');
                const htmlAsset = getHtmlAsset('<body><img src="foo.png"></body>');

                const assetGraph = await htmlAsset.assetGraph
                    .on('warn', warnSpy)
                    .populate();

                expect(warnSpy, 'to have calls satisfying', () => warnSpy(/^ENOENT/));

                const relation = new AssetGraph.HtmlResourceHint({
                    to: assetGraph.findAssets()[1]
                });

                expect(relation.as, 'to be', 'image');
            });

            it('should handle script', async function () {
                const warnSpy = sinon.spy().named('warn');
                const htmlAsset = getHtmlAsset('<body><script src="foo.js"></script></body>');

                const assetGraph = await htmlAsset.assetGraph
                    .on('warn', warnSpy)
                    .populate();

                expect(warnSpy, 'to have calls satisfying', () => warnSpy(/^ENOENT/));

                const relation = new AssetGraph.HtmlResourceHint({
                    to: assetGraph.findAssets()[1]
                });

                expect(relation.as, 'to be', 'script');
            });

            it('should handle style', async function () {
                const warnSpy = sinon.spy().named('warn');
                const htmlAsset = getHtmlAsset('<body><link rel="stylesheet" href="foo.css"></body>');

                const assetGraph = await htmlAsset.assetGraph
                    .on('warn', warnSpy)
                    .populate();

                const relation = new AssetGraph.HtmlResourceHint({
                    to: assetGraph.findAssets()[1]
                });

                expect(relation.as, 'to be', 'style');
            });

            it('should handle style with unknown file extension', async function () {
                const warnSpy = sinon.spy().named('warn');
                const htmlAsset = getHtmlAsset('<body><link rel="stylesheet" href="foo.scss"></body>');

                const assetGraph = await htmlAsset.assetGraph
                    .on('warn', warnSpy)
                    .populate();

                const relation = new AssetGraph.HtmlResourceHint({
                    to: assetGraph.findAssets()[1]
                });

                expect(relation.as, 'to be', 'style');
            });

            it('should handle an iframe', async function () {
                const warnSpy = sinon.spy().named('warn');
                const htmlAsset = getHtmlAsset('<body><iframe src="foo.html"></iframe></body>');

                const assetGraph = await htmlAsset.assetGraph
                    .on('warn', warnSpy)
                    .populate();

                const relation = new AssetGraph.HtmlResourceHint({
                    to: assetGraph.findAssets()[1]
                });

                expect(relation.as, 'to be', 'document');
            });

            it.skip('should handle a frame', async function () {
                const warnSpy = sinon.spy().named('warn');
                const htmlAsset = getHtmlAsset('<body><frameset><frame src="foo.html"></frameset></body>');

                const assetGraph = await htmlAsset.assetGraph
                    .on('warn', warnSpy)
                    .populate();

                const relation = new AssetGraph.HtmlResourceHint({
                    to: assetGraph.findAssets()[1]
                });

                expect(relation.as, 'to be', 'document');
            });

            it('should handle audio', async function () {
                const warnSpy = sinon.spy().named('warn');
                const htmlAsset = getHtmlAsset('<body><audio src="foo.wav"></body>');

                const assetGraph = await htmlAsset.assetGraph
                    .on('warn', warnSpy)
                    .populate();

                const relation = new AssetGraph.HtmlResourceHint({
                    to: assetGraph.findAssets()[1]
                });

                expect(relation.as, 'to be', 'media');
            });

            it('should handle video', async function () {
                const warnSpy = sinon.spy().named('warn');
                const htmlAsset = getHtmlAsset('<body><video src="foo.wav"></body>');

                const assetGraph = await htmlAsset.assetGraph
                    .on('warn', warnSpy)
                    .populate();

                const relation = new AssetGraph.HtmlResourceHint({
                    to: assetGraph.findAssets()[1]
                });

                expect(relation.as, 'to be', 'media');
            });

            it('should handle css fonts', async function () {
                const warnSpy = sinon.spy().named('warn');
                const htmlAsset = getHtmlAsset('<body><style>@font-face { font-family: "Noto Serif"; font-style: normal; font-weight: 400; src: url(foo.woff2) format("woff2"); }</style></body>');

                const assetGraph = await htmlAsset.assetGraph
                    .on('warn', warnSpy)
                    .populate();

                const relation = new AssetGraph.HtmlResourceHint({
                    to: assetGraph.findAssets()[2]
                });

                expect(relation.as, 'to be', 'font');
            });

            it('should handle embeds', async function () {
                const warnSpy = sinon.spy().named('warn');
                const htmlAsset = getHtmlAsset('<body><embed src="foo.wav"></body>');

                const assetGraph = await htmlAsset.assetGraph
                    .on('warn', warnSpy)
                    .populate();

                const relation = new AssetGraph.HtmlResourceHint({
                    to: assetGraph.findAssets()[1]
                });

                expect(relation.as, 'to be', 'embed');
            });

            it('should handle objects', async function () {
                const warnSpy = sinon.spy().named('warn');
                const htmlAsset = getHtmlAsset('<body><object data="foo.wav"></object></body>');

                const assetGraph = await htmlAsset.assetGraph
                    .on('warn', warnSpy)
                    .populate();

                const relation = new AssetGraph.HtmlResourceHint({
                    to: assetGraph.findAssets()[1]
                });

                expect(relation.as, 'to be', 'object');
            });
        });
    });
});
