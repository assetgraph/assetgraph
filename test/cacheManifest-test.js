var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = require('../lib/transforms');

vows.describe('Cache manifest').addBatch({
    'After loading a single-page test case with an existing cache manifest': {
        topic: function () {
            new AssetGraph({root: __dirname + '/cacheManifest/existingCacheManifest/'}).transform(
                transforms.loadAssets('index.html'),
                transforms.populate(),
                transforms.escapeToCallback(this.callback)
            );
        },
        'the graph should contain 4 relations': function (assetGraph) {
            assert.equal(assetGraph.relations.length, 4);
        },
        'the graph should contain 4 assets': function (assetGraph) {
            assert.equal(assetGraph.assets.length, 4);
        },
        'the graph contains a single cache manifest': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'CacheManifest'}).length, 1);
        },
        'the cache manifest has an outgoing relation to an image': function (assetGraph) {
            var outgoingRelations = assetGraph.findRelations({from: assetGraph.findAssets({type: 'CacheManifest'})[0]}); // FIXME: query
            assert.equal(outgoingRelations.length, 1);
            assert.equal(outgoingRelations[0].to.type, 'PNG');
        },
        'then running the addCacheManifestSinglePage transform': {
            topic: function (assetGraph) {
                assetGraph.transform(
                    transforms.addCacheManifestSinglePage({isInitial: true}),
                    transforms.escapeToCallback(this.callback)
                );
            },
            'there should still be a single cache manifest asset': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'CacheManifest'}).length, 1);
            },
            'the manifest should have a relation to bar.png': function (assetGraph) {
                var barPng = assetGraph.assetsByUrl[assetGraph.root + 'bar.png'],
                    manifest = assetGraph.findAssets({type: 'CacheManifest'})[0];
                assert.equal(assetGraph.findRelations({from: manifest, to: barPng}).length, 1); // FIXME: query
            },
            'then serializing the manifest': {
                topic: function (assetGraph) {
                    assetGraph.findAssets({type: 'CacheManifest'})[0].serialize(this.callback);
                },
                'it should only point to foo.png once': function (src) {
                    assert.equal(src.match(/^foo.png/gm).length, 1);
                },
                'it should still contain the original NETWORK and FALLBACK sections': function (src) {
                    assert.isTrue(src.indexOf("NETWORK:\n/helloworld.php\n") !== -1);
                    assert.isTrue(src.indexOf("FALLBACK:\nheresthething.asp foo.png\n") !== -1);
                }
            }
        }
    },
    'After loading a test case with no manifest': {
        topic: function () {
            new AssetGraph({root: __dirname + '/cacheManifest/noCacheManifest/'}).transform(
                transforms.loadAssets('index.html'),
                transforms.populate(),
                transforms.escapeToCallback(this.callback)
            );
        },
        'the graph contains 3 assets': function (assetGraph) {
            assert.equal(assetGraph.assets.length, 3);
        },
        'the graph contains 3 relations': function (assetGraph) {
            assert.equal(assetGraph.relations.length, 3);
        },
        'the graph contains a single PNG asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'PNG'}).length, 1);
        },
        'the graph contains a single HTML asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'HTML'}).length, 1);
        },
        'the graph contains a single CSS asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'CSS'}).length, 1);
        },
        'then adding a cache manifest to the HTML file using the "single page" method': {
            topic: function (assetGraph) {
                assetGraph.transform(
                    transforms.addCacheManifestSinglePage({isInitial: true}),
                    transforms.escapeToCallback(this.callback)
                );
            },
            'the graph should contain a cache manifest': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'CacheManifest'}).length, 1);
            },
            'the cache manifest should have 2 outgoing relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({from: assetGraph.findAssets({type: 'CacheManifest'})[0]}).length, 2); // FIXME: query
            }
        }
    },
    'After loading a multi-page test case with no manifest': {
        topic: function () {
            new AssetGraph({root: __dirname + '/cacheManifest/noCacheManifestMultiPage/'}).transform(
                transforms.loadAssets('*.html'),
                transforms.populate(),
                transforms.escapeToCallback(this.callback)
            );
        },
        'the graph contains 3 assets': function (assetGraph) {
            assert.equal(assetGraph.assets.length, 3);
        },
        'the graph contains 4 relations': function (assetGraph) {
            assert.equal(assetGraph.relations.length, 4);
        },
        'the graph contains 1 PNG': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'PNG'}).length, 1);
        },
        'the graph contains 2 HTML assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'HTML'}).length, 2);
        },
        'the graph contains an IFrame relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HTMLIFrame'}).length, 1);
        },
        'the graph contains 2 HTML image relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HTMLImage'}).length, 2);
        },
        'then adding a cache manifest to the HTML file using the "site map" method': {
            topic: function (assetGraph) {
                assetGraph.transform(
                    transforms.addCacheManifestSiteMap({isInitial: true}),
                    transforms.escapeToCallback(this.callback)
                );
            },
            'the graph should contain the manifest': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'CacheManifest'}).length, 1);
            },
            'the manifest should have 3 outgoing relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({from: assetGraph.findAssets({type: 'CacheManifest'})[0]}).length, 3);
            },
            'the manifest should have 2 incoming relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({to: assetGraph.findAssets({type: 'CacheManifest'})[0]}).length, 2);
            }
        }
    },
    'After loading a multi-page test case with one existing manifest': {
        topic: function () {
            new AssetGraph({root: __dirname + '/cacheManifest/existingCacheManifestMultiPage/'}).transform(
                transforms.loadAssets('*.html'),
                transforms.populate(),
                transforms.escapeToCallback(this.callback)
            );
        },
        'the graph should contain two HTML assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'HTML'}).length, 2);
        },
        'the graph should contain a single cache manifest': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'CacheManifest'}).length, 1);
        },
        'the graph should contain a single CSS asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'CSS'}).length, 1);
        },
        'the graph should contain two PNG assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'PNG'}).length, 2);
        },
        'then running the addCacheManifestSiteMap transform': {
            topic: function (assetGraph) {
                assetGraph.transform(
                    transforms.addCacheManifestSiteMap({isInitial: true}),
                    transforms.escapeToCallback(this.callback)
                );
            },
            'the graph should contain two cache manifests': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'CacheManifest'}).length, 2);
            },
            'the cache manifests should both refer to all assets': function (assetGraph) {
                var manifests = assetGraph.findAssets({type: 'CacheManifest'});
                assert.equal(assetGraph.findRelations({from: manifests[0]}).length, 6);
                assert.equal(assetGraph.findRelations({from: manifests[1]}).length, 6);
            }
        }
    }
})['export'](module);
