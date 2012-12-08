var vows = require('vows'),
    assert = require('assert'),
    passError = require('passerror'),
    AssetGraph = require('../lib/AssetGraph'),
    assetGraphRoot = __dirname + '/resolveAssetConfig/';

function resolveAssetConfig(assetConfig, fromUrl) {
    return function () {
        var assetGraph = new AssetGraph({root: assetGraphRoot});
        assetGraph.resolveAssetConfig(assetConfig, fromUrl || assetGraph.root, this.callback);
    };
}

function resolveAssetConfigAndEnsureType(assetConfig, fromUrl) {
    return function () {
        var callback = this.callback,
            assetGraph = new AssetGraph({root: assetGraphRoot});
        assetGraph.resolveAssetConfig(assetConfig, fromUrl || assetGraph.root, passError(callback, function (resolvedAssetConfig) {
            assetGraph.ensureAssetConfigHasType(resolvedAssetConfig, passError(callback, function () {
                callback(null, resolvedAssetConfig);
            }));
        }));
    };
}

vows.describe('resolveAssetConfig').addBatch({
    'relative path': {
        topic: resolveAssetConfig('foo.png'),
        'should return assetConfig with expanded url': function (resolvedAssetConfig) {
            assert.equal(resolvedAssetConfig.type, 'Png');
        }
    },
    'wildcard: *.png': {
        topic: resolveAssetConfig('*.png'),
        'should return assetConfig array with foo.png and bar.png': function (resolvedAssetConfigs) {
            assert.isArray(resolvedAssetConfigs);
            assert.equal(resolvedAssetConfigs.length, 2);
            assert.isObject(resolvedAssetConfigs[0]);
            assert.equal(resolvedAssetConfigs[0].type, 'Png');
            assert.isObject(resolvedAssetConfigs[1]);
            assert.equal(resolvedAssetConfigs[1].type, 'Png');
        }
    },
    'http: url': {
        topic: resolveAssetConfig('http://www.example.com/foo.gif'),
        'should return assetConfig with a single entry': function (resolvedAssetConfig) {
            assert.isObject(resolvedAssetConfig);
            assert.equal(resolvedAssetConfig.url, 'http://www.example.com/foo.gif');
            assert.equal(resolvedAssetConfig.type, 'Gif');
        }
    },
    'data: url': {
        topic: resolveAssetConfig('data:text/html;base64,SGVsbG8sIHdvcmxkIQo='),
        'should decode correctly': function (resolvedAssetConfig) {
            assert.isObject(resolvedAssetConfig);
            assert.equal(resolvedAssetConfig.rawSrc, "Hello, world!\n");
        }
    },
    'expand dir without trailing slash': {
        topic: resolveAssetConfigAndEnsureType('subdir'),
        'should resolve to dir/index.html': function (resolvedAssetConfig) {
            assert.equal(resolvedAssetConfig.type, 'Html');
            assert.equal(resolvedAssetConfig.url, 'file://' + assetGraphRoot + 'subdir/index.html');
        }
    },
    'expand dir with trailing slash': {
        topic: resolveAssetConfigAndEnsureType('subdir'),
        'should resolve to dir/index.html': function (resolvedAssetConfig) {
            assert.equal(resolvedAssetConfig.type, 'Html');
            assert.equal(resolvedAssetConfig.url, 'file://' + assetGraphRoot + 'subdir/index.html');
        }
    }
})['export'](module);
