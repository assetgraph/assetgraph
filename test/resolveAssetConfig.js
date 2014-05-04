var expect = require('./unexpected-with-plugins'),
    passError = require('passerror'),
    AssetGraph = require('../lib'),
    assetGraphRoot = __dirname + '/resolveAssetConfig/';

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

    it('should handle a wildcard: *.png', function (done) {
        resolveAssetConfig('*.png', passError(done, function (resolvedAssetConfigs) {
            expect(resolvedAssetConfigs, 'to be an array');
            expect(resolvedAssetConfigs, 'to have length', 2);
            expect(resolvedAssetConfigs[0], 'to be an object');
            expect(resolvedAssetConfigs[0].type, 'to equal', 'Png');
            expect(resolvedAssetConfigs[1], 'to be an object');
            expect(resolvedAssetConfigs[1].type, 'to equal', 'Png');
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
});
