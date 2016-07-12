/*global describe, it*/
var expect = require('./unexpected-with-plugins'),
    passError = require('passerror'),
    AssetGraph = require('../lib'),
    Path = require('path'),
    assetGraphRoot = Path.resolve(__dirname, '..', 'testdata', 'resolveAssetConfig') + '/';

function resolveAssetConfig(assetConfig, fromUrl, cb) {
    if (typeof fromUrl === 'function') {
        cb = fromUrl;
        fromUrl = null;
    }
    var assetGraph = new AssetGraph({root: assetGraphRoot});
    assetGraph.resolveAssetConfig(assetConfig, fromUrl || assetGraph.root, cb);
}

function resolveAssetConfigAndEnsureType(assetConfig, fromUrl, cb) {
    if (typeof fromUrl === 'function') {
        cb = fromUrl;
        fromUrl = null;
    }
    var assetGraph = new AssetGraph({root: assetGraphRoot});
    assetGraph.resolveAssetConfig(assetConfig, fromUrl || assetGraph.root, passError(cb, function (resolvedAssetConfig) {
        assetGraph.ensureAssetConfigHasType(resolvedAssetConfig, passError(cb, function () {
            cb(null, resolvedAssetConfig);
        }));
    }));
}

describe('resolveAssetConfig', function () {
    it('should handle a relative path', function (done) {
        resolveAssetConfig('foo.png', passError(done, function (resolvedAssetConfig) {
            expect(resolvedAssetConfig.type, 'to equal', 'Png');
            done();
        }));
    });

    it('should handle an http: url', function (done) {
        resolveAssetConfig('http://www.example.com/foo.gif', passError(done, function (resolvedAssetConfig) {
            expect(resolvedAssetConfig, 'to be an object');
            expect(resolvedAssetConfig.url, 'to equal', 'http://www.example.com/foo.gif');
            expect(resolvedAssetConfig.type, 'to equal', 'Gif');
            done();
        }));
    });

    it('should handle a data: url', function (done) {
        resolveAssetConfig('data:text/html;base64,SGVsbG8sIHdvcmxkIQo=', passError(done, function (resolvedAssetConfig) {
            expect(resolvedAssetConfig, 'to be an object');
            expect(resolvedAssetConfig.rawSrc, 'to equal', new Buffer('Hello, world!\n', 'utf-8'));
            done();
        }));
    });

    it('should expand dir without trailing slash', function (done) {
        resolveAssetConfigAndEnsureType('subdir', passError(done, function (resolvedAssetConfig) {
            expect(resolvedAssetConfig.type, 'to equal', 'Html');
            expect(resolvedAssetConfig.url, 'to equal', 'file://' + assetGraphRoot + 'subdir/index.html');
            done();
        }));
    });

    it('should expand dir with trailing slash', function (done) {
        resolveAssetConfigAndEnsureType('subdir', passError(done, function (resolvedAssetConfig) {
            expect(resolvedAssetConfig.type, 'to equal', 'Html');
            expect(resolvedAssetConfig.url, 'to equal', 'file://' + assetGraphRoot + 'subdir/index.html');
            done();
        }));
    });

    it('should not loop infinitely when encountering non-resolvable urls', function (done) {
        var assetGraph = new AssetGraph({root: assetGraphRoot});
        assetGraph._warnings = [];

        assetGraph.on('warn', function (warning) {
            assetGraph._warnings.push(warning);
        });

        assetGraph.resolveAssetConfig('my-funky.scheme://www.example.com/', assetGraph.root, function (error, resolvedAssetConfig) {
            expect(error, 'to be', null);
            expect(resolvedAssetConfig, 'to equal', {url: 'my-funky.scheme://www.example.com/'});
            expect(assetGraph._warnings, 'to be an array');
            expect(assetGraph._warnings, 'to have length', 1);
            expect(assetGraph._warnings[0].message, 'to match', /^No resolver found for protocol: my-funky.scheme/);
            done();
        });
    });

    it('should accept `-` as part of the protocol', function (done) {
        var assetGraph = new AssetGraph({root: assetGraphRoot});
        assetGraph._warnings = [];

        assetGraph.on('warn', function (warning) {
            assetGraph._warnings.push(warning);
        });

        assetGraph.resolveAssetConfig('android-app://www.example.com/', assetGraph.root, function (error, resolvedAssetConfig) {
            expect(error, 'to be', null);
            expect(resolvedAssetConfig, 'to equal', { url: 'android-app://www.example.com/' });
            expect(assetGraph._warnings, 'to be an empty array');
            done();
        });
    });

    it('should only warn about unknown unsupported protocols', function (done) {
        var warnings = [];
        new AssetGraph({root: __dirname + '/../testdata/unsupportedProtocols/'})
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
            })
            .run(done);
    });
});
