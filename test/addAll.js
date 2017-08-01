const expect = require('./unexpected-with-plugins');
const AssetGraph = require('../');

describe('AssetGraph#addAll', function () {
    describe('with an array', function () {
        it('should add all the asset configs to the graph and return the created instances', function () {
            const assetGraph = new AssetGraph();
            expect(assetGraph.addAll([
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
            expect(assetGraph.addAll('*.html'), 'to satisfy', [
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

    describe('with a single asset config object', function () {
        it('should create and add the asset and return it in an array', function () {
            const assetGraph = new AssetGraph();
            const assets = assetGraph.addAll({
                type: 'Css',
                url: 'https://example.com/styles.css',
                text: 'body { background-image: url(https://example.com/foo.png); }'
            });
            expect(assets, 'to satisfy', [
                { url: 'https://example.com/styles.css' }
            ]);
            expect(assetGraph, 'to contain asset', {
                type: 'Asset',
                url: 'https://example.com/foo.png',
                isLoaded: false
            });
        });
    });
});
