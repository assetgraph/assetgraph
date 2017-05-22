/*global describe, it*/
var expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib/AssetGraph'),
    Path = require('path'),
    assetGraphRoot = Path.resolve(__dirname, '..', 'testdata', 'resolveAssetConfig') + '/';

function resolveAssetConfig(assetConfig, fromUrl) {
    var assetGraph = new AssetGraph({root: assetGraphRoot});
    return assetGraph.resolveAssetConfig(assetConfig, fromUrl || assetGraph.root);
}

function resolveAssetConfigAndEnsureType(assetConfig, fromUrl) {
    var assetGraph = new AssetGraph({root: assetGraphRoot});
    return assetGraph.ensureAssetConfigHasType(assetGraph.resolveAssetConfig(assetConfig, fromUrl || assetGraph.root));
}

describe('resolveAssetConfig', function () {
    it('should handle a relative path', function () {
        expect(resolveAssetConfig('foo.png').type, 'to equal', 'Png');
    });

    it('should handle an http: url', function () {
        var resolvedAssetConfig = resolveAssetConfig('http://www.example.com/foo.gif');
        expect(resolvedAssetConfig, 'to be an object');
        expect(resolvedAssetConfig.url, 'to equal', 'http://www.example.com/foo.gif');
        expect(resolvedAssetConfig.type, 'to equal', 'Gif');
    });

    it('should handle a data: url', function () {
        var resolvedAssetConfig = resolveAssetConfig('data:text/html;base64,SGVsbG8sIHdvcmxkIQo=');
        expect(resolvedAssetConfig, 'to be an object');
        expect(resolvedAssetConfig.rawSrc, 'to equal', new Buffer('Hello, world!\n', 'utf-8'));
    });

    it('should expand dir without trailing slash', function () {
        return resolveAssetConfigAndEnsureType('subdir').then(function (resolvedAssetConfig) {
            expect(resolvedAssetConfig.type, 'to equal', 'Html');
            expect(resolvedAssetConfig.url, 'to equal', 'file://' + assetGraphRoot + 'subdir/index.html');
        });
    });

    it('should expand dir with trailing slash', function () {
        return resolveAssetConfigAndEnsureType('subdir').then(function (resolvedAssetConfig) {
            expect(resolvedAssetConfig.type, 'to equal', 'Html');
            expect(resolvedAssetConfig.url, 'to equal', 'file://' + assetGraphRoot + 'subdir/index.html');
        });
    });

    it('should not loop infinitely when encountering non-resolvable urls', function () {
        var assetGraph = new AssetGraph({root: assetGraphRoot});
        assetGraph._warnings = [];

        assetGraph.on('warn', function (warning) {
            assetGraph._warnings.push(warning);
        });

        var resolvedAssetConfig = assetGraph.resolveAssetConfig('my-funky.scheme://www.example.com/', assetGraph.root);
        expect(resolvedAssetConfig, 'to equal', {url: 'my-funky.scheme://www.example.com/'});
        expect(assetGraph._warnings, 'to be an array');
        expect(assetGraph._warnings, 'to have length', 1);
        expect(assetGraph._warnings[0].message, 'to match', /^No resolver found for protocol: my-funky.scheme/);
    });

    it('should accept `-` as part of the protocol', function () {
        var assetGraph = new AssetGraph({root: assetGraphRoot});
        assetGraph._warnings = [];

        assetGraph.on('warn', function (warning) {
            assetGraph._warnings.push(warning);
        });

        var resolvedAssetConfig = assetGraph.resolveAssetConfig('android-app://www.example.com/', assetGraph.root);
        expect(resolvedAssetConfig, 'to equal', { url: 'android-app://www.example.com/' });
        expect(assetGraph._warnings, 'to be an empty array');
    });

    it('should only warn about unknown unsupported protocols', function () {
        var warnings = [];
        return new AssetGraph({root: __dirname + '/../testdata/unsupportedProtocols/'})
            .on('warn', function (err) {
                warnings.push(err);
            })
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph.findRelations({}, true), 'to satisfy', [
                    { to: { url: 'mailto:foo@bar.com' } },
                    { to: { url: 'tel:9876543' } },
                    { to: { url: 'sms:9876543' } },
                    { to: { url: 'fax:9876543' } },
                    { to: { url: 'httpz://foo.com/' } }
                ]);
                expect(warnings, 'to equal', [
                    new Error('No resolver found for protocol: httpz\n\tIf you think this protocol should exist, please contribute it here:\n\thttps://github.com/Munter/schemes#contributing')
                ]);
            });
    });
});
