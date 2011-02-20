var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = require('../lib/transforms'),
    assetGraphRoot = __dirname + '/resolveAssetConfig/';

function resolveAssetConfig(assetConfig, fromUrl, cb) {
    return function () {
        var assetGraph = new AssetGraph({root: assetGraphRoot});
        assetGraph.resolver.resolve(assetConfig, fromUrl || assetGraph.resolver.root, cb || this.callback);
    };
}

vows.describe('resolveAssetConfig').addBatch({
    'relative path': {
        topic: resolveAssetConfig('foo.png'),
        'should return assetConfig with expanded url': function (resolvedAssetConfig) {
            assert.equal(resolvedAssetConfig.type, 'PNG');
        }
    },
    'wildcard: *.png': {
        topic: resolveAssetConfig('*.png'),
        'should return assetConfig array with foo.png and bar.png': function (resolvedAssetConfigs) {
            assert.isArray(resolvedAssetConfigs);
            assert.equal(resolvedAssetConfigs.length, 2);
            assert.isObject(resolvedAssetConfigs[0]);
            assert.equal(resolvedAssetConfigs[0].type, 'PNG');
            assert.isObject(resolvedAssetConfigs[1]);
            assert.equal(resolvedAssetConfigs[1].type, 'PNG');
        }
    },
    'http: url': {
        topic: resolveAssetConfig('http://www.example.com/foo.gif'),
        'should return assetConfig with a single entry': function (resolvedAssetConfig) {
            assert.isObject(resolvedAssetConfig);
            assert.equal(resolvedAssetConfig.url, 'http://www.example.com/foo.gif');
            assert.equal(resolvedAssetConfig.type, 'GIF');
        }
    },
    'custom url (find parent directory case)': {
        topic: resolveAssetConfig('directory:quux.png'),
        'should find the directory and the file': function (resolvedAssetConfig) {
            assert.isObject(resolvedAssetConfig);
            assert.equal(resolvedAssetConfig.url, 'file://' + assetGraphRoot + 'directory/quux.png');
        }
    },
    'data: url': {
        topic: resolveAssetConfig('data:text/html;base64,SGVsbG8sIHdvcmxkIQo='),
        'should decode correctly': function (resolvedAssetConfig) {
            assert.isObject(resolvedAssetConfig);
            assert.equal(resolvedAssetConfig.originalSrc, "Hello, world!\n");
        }
    },
    'parent dir + wildcard': {
        topic: resolveAssetConfig('otherdirectory:onemorelevel/*.png', 'file://' + assetGraphRoot + 'directory'),
        'should resolve to two PNGs': function (resolvedAssetConfigs) {
            assert.isArray(resolvedAssetConfigs);
            assert.equal(resolvedAssetConfigs.length, 2);
            assert.isObject(resolvedAssetConfigs[0]);
            assert.equal(resolvedAssetConfigs[0].type, 'PNG');
            assert.isObject(resolvedAssetConfigs[1]);
            assert.equal(resolvedAssetConfigs[1].type, 'PNG');
        }
    },
    'expand dir without trailing slash': {
        topic: resolveAssetConfig('subdir'),
        'should resolve to dir/index.html': function (resolvedAssetConfig) {
            assert.equal(resolvedAssetConfig.type, 'HTML');
            assert.equal(resolvedAssetConfig.url, 'file://' + assetGraphRoot + 'subdir/index.html');
        }
    },
    'expand dir with trailing slash': {
        topic: resolveAssetConfig('subdir'),
        'should resolve to dir/index.html': function (resolvedAssetConfig) {
            assert.equal(resolvedAssetConfig.type, 'HTML');
            assert.equal(resolvedAssetConfig.url, 'file://' + assetGraphRoot + 'subdir/index.html');
        }
    }
})['export'](module);
