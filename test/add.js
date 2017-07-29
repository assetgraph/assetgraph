const expect = require('./unexpected-with-plugins');
const AssetGraph = require('../');
const httpception = require('httpception');
const sinon = require('sinon');

describe('AssetGraph#add', function () {
    describe('with an array', function () {
        it('should add all the asset configs to the graph and return the created instances', function () {
            const assetGraph = new AssetGraph();
            expect(assetGraph.add([
                {
                    type: 'Css',
                    url: 'https://example.com/styles.css',
                    text: 'body { color: teal; }'
                },
                {
                    type: 'Css',
                    url: 'https://example.com/moreStyles.css',
                    text: 'body { color: teal; }'
                }
            ]), 'to satisfy', [
                { isAsset: true, url: 'https://example.com/styles.css' },
                { isAsset: true, url: 'https://example.com/moreStyles.css' }
            ]);
            expect(assetGraph, 'to contain asset', {
                url: 'https://example.com/styles.css'
            }).and('to contain asset', {
                url: 'https://example.com/moreStyles.css'
            });;
        });
    });

    describe('with a glob pattern', function () {
        it('should add all the matched assets to the graph', function () {
            const assetGraph = new AssetGraph({ root: __dirname + '/../testdata/add/glob/'});
            expect(assetGraph.add('*.html'), 'to satisfy', [
                { isAsset: true, fileName: 'index1.html' },
                { isAsset: true, fileName: 'index2.html' }
            ]);
            expect(assetGraph, 'to contain asset', {
                type: 'Asset',
                fileName: 'index1.html',
                isLoaded: false
            }).and('to contain asset', {
                type: 'Asset',
                fileName: 'index2.html',
                isLoaded: false
            });;
        });
    });

    describe('with an asset config that includes the body', function () {
        it('should add the targets of all external outgoing relations as unloaded Asset instances', function () {
            const assetGraph = new AssetGraph();
            assetGraph.add({
                type: 'Css',
                url: 'https://example.com/styles.css',
                text: 'body { background-image: url(https://example.com/foo.png); }'
            });
            expect(assetGraph, 'to contain asset', {
                type: 'Asset',
                url: 'https://example.com/foo.png',
                isLoaded: false
            });
        });
    });

    describe('with an asset config that does not include the body', function () {
        it('should add the targets of all external outgoing relations as unloaded Asset instances once the asset is loaded', async function () {
            const assetGraph = new AssetGraph();
            const [ cssAsset ] = assetGraph.add({
                type: 'Css',
                url: 'https://example.com/styles.css'
            });

            httpception({
                request: 'GET https://example.com/styles.css',
                response: {
                    headers: {
                        'Content-Type': 'text/css'
                    },
                    body: 'body { background-image: url(https://example.com/foo.png); }'
                }
            });

            await cssAsset.load();

            expect(assetGraph, 'to contain asset', {
                type: 'Asset',
                url: 'https://example.com/foo.png',
                isLoaded: false
            });
        });
    });

    describe('when the url already exists in the graph', function () {
        it('should return the existing instance', function () {
            const assetGraph = new AssetGraph();
            const [ cssAsset ] = assetGraph.add({
                type: 'Css',
                url: 'https://example.com/styles.css',
                text: 'body { color: teal; }'
            });
            expect(cssAsset, 'to be a', AssetGraph.Css)
                .and('to satisfy', { text: 'body { color: teal; }' });

            const [ cssAsset2 ] = assetGraph.add({
                type: 'Css',
                url: 'https://example.com/styles.css',
                text: 'body { color: teal; }'
            });

            expect(cssAsset2, 'to be', cssAsset);
        });
    });

    describe('when more information arrives about an existing asset', function () {
        it.skip('should upgrade from Xml to Atom', async function () {
            const assetGraph = new AssetGraph();
            const [ xmlAsset ] = assetGraph.add({
                url: 'http://example.com/feed.xml',
                text: `
                    <?xml version="1.0" encoding="utf-8"?>
                    <feed xmlns="http://www.w3.org/2005/Atom">
                      <title>Example blog</title>
                      <updated>2014-08-29T00:11:13+02:00</updated>
                      <id>http://example.com/</id>
                      <entry>
                        <title>Karma Generator Rewrite 0.8.0</title>
                        <link href="http://example.com/blog/article/"/>
                        <updated>2014-05-12T00:00:00+02:00</updated>
                        <id>http://example.com/blog/article/</id>
                        <content type="html">This contains an image: &lt;img src=&quot;foo.png&quot;&gt; and a &lt;a href=&quot;bar.html&quot;&gt;relative link&lt;/a&gt;</content>
                      </entry>
                    </feed>
                `
            });

            await xmlAsset.load();

            expect(assetGraph, 'to contain no assets', 'Png');

            const infoSpy = sinon.spy().named('info');
            assetGraph.on('info', infoSpy);

            assetGraph.add({
                url: 'http://example.com/feed.xml',
                contentType: 'application/atom+xml'
            });

            expect(assetGraph, 'to contain asset', 'Atom');
            expect(assetGraph, 'to contain asset', 'Png');
            expect(assetGraph, 'to no contain asset', 'Xml');
        });

        it('should upgrade an unloaded asset with text', async function () {
            const assetGraph = new AssetGraph();
            assetGraph.add({
                type: 'Css',
                url: 'http://example.com/styles.css',
                text: '@import "more.css";'
            });
            expect(assetGraph, 'to contain asset', {
                url: 'http://example.com/more.css'
            });
            await assetGraph.add({
                type: 'Css',
                url: 'http://example.com/more.css',
                text: 'body { color: teal; }'
            })[0].load();

            expect(assetGraph, 'to contain asset', {
                url: 'http://example.com/more.css',
                text: 'body { color: teal; }'
            });
            expect(assetGraph, 'to contain assets', 2);
            expect(assetGraph, 'to contain relation', {
                type: 'CssImport',
                from: {
                    url: 'http://example.com/styles.css'
                },
                to: {
                    url: 'http://example.com/more.css'
                }
            });
        });
    });
});
