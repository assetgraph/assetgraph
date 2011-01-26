var vows = require('vows'),
    assert = require('assert'),
    SiteGraph = require('../SiteGraph'),
    transforms = require('../transforms');

vows.describe('Cache manifest').addBatch({
    'After loading a single-page test case with an existing cache manifest': {
        topic: function () {
            new SiteGraph({root: __dirname + '/cacheManifest/existingCacheManifest/'}).applyTransform(
                transforms.addInitialAssets('index.html'),
                transforms.populate(),
                transforms.escapeToCallback(this.callback)
            );
        },
        'the graph should contain 3 relations': function (siteGraph) {
            assert.equal(siteGraph.relations.length, 3);
        },
        'the graph should contain 3 assets': function (siteGraph) {
            assert.equal(siteGraph.assets.length, 3);
        },
        'the graph contains a cache manifest with an outgoing relation to an image': function (siteGraph) {
            assert.equal(siteGraph.findAssets('type', 'CacheManifest').length, 1);
        },
        'the cache manifest has an outgoing relation to an image': function (siteGraph) {
            var outgoingRelations = siteGraph.findRelations('from', siteGraph.findAssets('type', 'CacheManifest')[0]);
            assert.equal(outgoingRelations.length, 1);
            assert.equal(outgoingRelations[0].to.type, 'PNG');
        }
    },
    'After loading a test case with no manifest': {
        topic: function () {
            new SiteGraph({root: __dirname + '/cacheManifest/noCacheManifest/'}).applyTransform(
                transforms.addInitialAssets('index.html'),
                transforms.populate(),
                transforms.escapeToCallback(this.callback)
            );
        },
        'the graph contains 3 assets': function (siteGraph) {
            assert.equal(siteGraph.assets.length, 3);
        },
        'the graph contains 3 relations': function (siteGraph) {
            assert.equal(siteGraph.relations.length, 3);
        },
        'the graph contains a single PNG asset': function (siteGraph) {
            assert.equal(siteGraph.findAssets('type', 'PNG').length, 1);
        },
        'the graph contains a single HTML asset': function (siteGraph) {
            assert.equal(siteGraph.findAssets('type', 'HTML').length, 1);
        },
        'the graph contains a single CSS asset': function (siteGraph) {
            assert.equal(siteGraph.findAssets('type', 'CSS').length, 1);
        },
        'then adding a cache manifest to the HTML file using the "single page" method': {
            topic: function (siteGraph) {
                siteGraph.applyTransform(
                    transforms.addCacheManifestSinglePage(),
                    transforms.escapeToCallback(this.callback)
                );
            },
            'the graph should contain a cache manifest': function (siteGraph) {
                assert.equal(siteGraph.findAssets('type', 'CacheManifest').length, 1);
            },
            'the cache manifest should have 2 outgoing relations': function (siteGraph) {
                assert.equal(siteGraph.findRelations('from', siteGraph.findAssets('type', 'CacheManifest')[0]).length, 2);
            }
        }
    },
    'After loading a multi-page test case with no manifest': {
        topic: function () {
            new SiteGraph({root: __dirname + '/cacheManifest/noCacheManifestMultiPage/'}).applyTransform(
                transforms.addInitialAssets('index.html'),
                transforms.populate(),
                transforms.escapeToCallback(this.callback)
            );
        },
        'the graph contains 3 assets': function (siteGraph) {
            assert.equal(siteGraph.assets.length, 3);
        },
        'the graph contains 4 relations': function (siteGraph) {
            assert.equal(siteGraph.relations.length, 4);
        },
        'the graph contains 1 PNG': function (siteGraph) {
            assert.equal(siteGraph.findAssets('type', 'PNG').length, 1);
        },
        'the graph contains 2 HTML assets': function (siteGraph) {
            assert.equal(siteGraph.findAssets('type', 'HTML').length, 2);
        },
        'the graph contains an IFrame relation': function (siteGraph) {
            assert.equal(siteGraph.findRelations('type', 'HTMLIFrame').length, 1);
        },
        'the graph contains 2 HTML image relations': function (siteGraph) {
            assert.equal(siteGraph.findRelations('type', 'HTMLImage').length, 2);
        },
        'then adding a cache manifest to the HTML file using the "site map" method': {
            topic: function (siteGraph) {
                siteGraph.applyTransform(
                    transforms.addCacheManifestSiteMap(),
                    transforms.escapeToCallback(this.callback)
                );
            },
            'the graph should contain the manifest': function (siteGraph) {
                assert.equal(siteGraph.findAssets('type', 'CacheManifest').length, 1);
            },
            'the manifest should have 3 outgoing relations': function (siteGraph) {
                assert.equal(siteGraph.findRelations('from', siteGraph.findAssets('type', 'CacheManifest')[0]).length, 3);
            },
            'the manifest should have 2 incoming relations': function (siteGraph) {
                assert.equal(siteGraph.findRelations('to', siteGraph.findAssets('type', 'CacheManifest')[0]).length, 2);
            }
        }
    }
})['export'](module);
