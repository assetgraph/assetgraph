var vows = require('vows'),
    assert = require('assert'),
    SiteGraph = require('../SiteGraph'),
    transforms = require('../transforms');

vows.describe('Cache manifest').addBatch({
    'After loading a test case with an existing cache manifest': {
        topic: function () {
            var siteGraph = new SiteGraph({root: __dirname + '/cacheManifest/existingCacheManifest/'}),
                htmlAsset = siteGraph.registerAsset('index.html');
            transforms.populate(siteGraph, htmlAsset, function () {return true;}, this.callback);
        },
        'the graph contains the expected number of assets and relations': function (siteGraph) {
            assert.equal(siteGraph.relations.length, 3);
            assert.equal(siteGraph.assets.length, 3);
        },
        'the graph contains one cache manifest with an outgoing relation to an image': function (siteGraph) {
            var cacheManifests = siteGraph.findAssets('type', 'CacheManifest');
            assert.equal(cacheManifests.length, 1);
            var outgoingRelations = siteGraph.findRelations('from', cacheManifests[0]);
            assert.equal(outgoingRelations.length, 1);
            assert.equal(outgoingRelations[0].to.type, 'PNG');
        }
    },
    'After loading a test case with no manifest': {
        topic: function () {
            var siteGraph = new SiteGraph({root: __dirname + '/cacheManifest/noCacheManifest/'}),
                htmlAsset = siteGraph.registerAsset('index.html');
            transforms.populate(siteGraph, htmlAsset, function () {return true;}, this.callback);
        },
        'the graph contains the expected assets and relations': function (siteGraph) {
            assert.equal(siteGraph.assets.length, 3);
            assert.equal(siteGraph.relations.length, 3);
            assert.equal(siteGraph.findAssets('type', 'PNG').length, 1);
            assert.equal(siteGraph.findAssets('type', 'HTML').length, 1);
            assert.equal(siteGraph.findAssets('type', 'CSS').length, 1);
        },
        'then adding a cache manifest to the HTML file': {
            topic: function (siteGraph) {
                transforms.addCacheManifest(siteGraph, siteGraph.findAssets('type', 'HTML')[0], this.callback);
            },
            'the graph should contain the manifest with the right outgoing relations': function (siteGraph) {
                var manifests = siteGraph.findAssets('type', 'CacheManifest');
                assert.equal(manifests.length, 1);
                var manifestRelations = siteGraph.findRelations('from', manifests[0]);
                assert.equal(manifestRelations.length, 2);
            }
        }
    }
})['export'](module);
