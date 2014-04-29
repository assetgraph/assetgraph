var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    passError = require('passerror'),
    AssetGraph = require('../lib'),
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
            expect(resolvedAssetConfig.type, 'to equal', 'Png');
        }
    },
    'wildcard: *.png': {
        topic: resolveAssetConfig('*.png'),
        'should return assetConfig array with foo.png and bar.png': function (resolvedAssetConfigs) {
            expect(resolvedAssetConfigs, 'to be an array');
            expect(resolvedAssetConfigs, 'to have length', 2);
            expect(resolvedAssetConfigs[0], 'to be an object');
            expect(resolvedAssetConfigs[0].type, 'to equal', 'Png');
            expect(resolvedAssetConfigs[1], 'to be an object');
            expect(resolvedAssetConfigs[1].type, 'to equal', 'Png');
        }
    },
    'http: url': {
        topic: resolveAssetConfig('http://www.example.com/foo.gif'),
        'should return assetConfig with a single entry': function (resolvedAssetConfig) {
            expect(resolvedAssetConfig, 'to be an object');
            expect(resolvedAssetConfig.url, 'to equal', 'http://www.example.com/foo.gif');
            expect(resolvedAssetConfig.type, 'to equal', 'Gif');
        }
    },
    'data: url': {
        topic: resolveAssetConfig('data:text/html;base64,SGVsbG8sIHdvcmxkIQo='),
        'should decode correctly': function (resolvedAssetConfig) {
            expect(resolvedAssetConfig, 'to be an object');
            expect(resolvedAssetConfig.rawSrc, 'to equal', new Buffer('Hello, world!\n', 'utf-8'));
        }
    },
    'expand dir without trailing slash': {
        topic: resolveAssetConfigAndEnsureType('subdir'),
        'should resolve to dir/index.html': function (resolvedAssetConfig) {
            expect(resolvedAssetConfig.type, 'to equal', 'Html');
            expect(resolvedAssetConfig.url, 'to equal', 'file://' + assetGraphRoot + 'subdir/index.html');
        }
    },
    'expand dir with trailing slash': {
        topic: resolveAssetConfigAndEnsureType('subdir'),
        'should resolve to dir/index.html': function (resolvedAssetConfig) {
            expect(resolvedAssetConfig.type, 'to equal', 'Html');
            expect(resolvedAssetConfig.url, 'to equal', 'file://' + assetGraphRoot + 'subdir/index.html');
        }
    }
})['export'](module);
