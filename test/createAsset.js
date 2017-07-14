/*global describe, it*/
const expect = require('./unexpected-with-plugins');
const AssetGraph = require('../lib/AssetGraph');
const sinon = require('sinon');
const httpception = require('httpception');
const Path = require('path');
const assetGraphRoot = Path.resolve(__dirname, '..', 'testdata', 'createAsset') + '/';

describe('createAsset', function () {
    it('should handle a relative path', async function () {
        const assetGraph = new AssetGraph({root: assetGraphRoot});
        const asset = assetGraph.createAsset('foo.png', assetGraph.root);
        assetGraph.addAsset(asset);
        await asset.load();
        expect(asset.type, 'to equal', 'Png');
    });

    it('should handle an http: url', async function () {
        httpception({
            request: 'GET http://www.example.com/foo.gif',
            response: {
                statusCode: 200,
                body: new Buffer('GIF')
            }
        });

        const assetGraph = new AssetGraph({root: assetGraphRoot});
        const asset = assetGraph.createAsset('http://www.example.com/foo.gif', assetGraph.root);
        assetGraph.addAsset(asset);
        await asset.load();
        expect(asset, 'to be an object');
        expect(asset.url, 'to equal', 'http://www.example.com/foo.gif');
        expect(asset.type, 'to equal', 'Gif');
    });

    it('should handle a data: url', async function () {
        const assetGraph = new AssetGraph({root: assetGraphRoot});
        const asset = assetGraph.createAsset('data:text/html;base64,SGVsbG8sIHdvcmxkIQo=', assetGraph.root);
        assetGraph.addAsset(asset);
        await asset.load();
        expect(asset, 'to be an object');
        expect(asset.rawSrc, 'to equal', new Buffer('Hello, world!\n', 'utf-8'));
    });

    it('should not loop infinitely when encountering non-resolvable urls', async function () {
        const assetGraph = new AssetGraph({root: assetGraphRoot});
        const warnSpy = sinon.spy().named('warn');
        assetGraph.on('warn', warnSpy);

        const asset = assetGraph.createAsset('my-funky.scheme://www.example.com/', assetGraph.root);
        assetGraph.addAsset(asset);

        await asset.load();
        expect(warnSpy, 'to have calls satisfying', () => warnSpy(/^No resolver found for protocol: my-funky.scheme/));
    });

    it('should accept `-` as part of the protocol', async function () {
        const assetGraph = new AssetGraph({root: assetGraphRoot});
        const warnSpy = sinon.spy().named('warn');

        assetGraph.on('warn', warnSpy);

        const asset = assetGraph.createAsset('android-app://www.example.com/');
        await asset.load();
        expect(asset, 'to satisfy', { url: 'android-app://www.example.com/' });
        expect(warnSpy, 'was not called');
    });

    it('should only warn about unknown unsupported protocols', function () {
        const warnSpy = sinon.spy().named('warn');

        return new AssetGraph({root: __dirname + '/../testdata/unsupportedProtocols/'})
            .on('warn', warnSpy)
            .loadAssets('index.html')
            .populate()
            .then(function (assetGraph) {
                expect(assetGraph.findRelations({}, true), 'to satisfy', [
                    { to: { url: 'mailto:foo@bar.com' } },
                    { to: { url: 'tel:9876543' } },
                    { to: { url: 'sms:9876543' } },
                    { to: { url: 'fax:9876543' } },
                    { to: { url: 'httpz://foo.com/' } }

                ]);

                expect(warnSpy, 'to have calls satisfying', () =>
                    warnSpy(new Error('No resolver found for protocol: httpz\n\tIf you think this protocol should exist, please contribute it here:\n\thttps://github.com/Munter/schemes#contributing'))
                );
            });
    });
});
