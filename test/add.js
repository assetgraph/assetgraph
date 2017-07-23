const expect = require('./unexpected-with-plugins');
const AssetGraph = require('../');
const httpception = require('httpception');

describe('AssetGraph#add', function () {
    describe('with an array', function () {
        it('should add all the asset configs to the graph and return the created instances', function () {
            const assetGraph = new AssetGraph();
            expect(assetGraph.addAsset([
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
            expect(assetGraph.addAsset('*.html'), 'to satisfy', [
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
            assetGraph.addAsset({
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
            const cssAsset = assetGraph.addAsset({
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
            const cssAsset = assetGraph.addAsset({
                type: 'Css',
                url: 'https://example.com/styles.css',
                text: 'body { color: teal; }'
            });
            expect(cssAsset, 'to be a', AssetGraph.Css)
                .and('to satisfy', { text: 'body { color: teal; }' });

            const cssAsset2 = assetGraph.addAsset({
                type: 'Css',
                url: 'https://example.com/styles.css',
                text: 'body { color: teal; }'
            });

            expect(cssAsset2, 'to be', cssAsset);
        });
    });

    describe('when more information arrives about an existing asset', function () {
        it('should upgrade from Xml to Atom');
    });
});
