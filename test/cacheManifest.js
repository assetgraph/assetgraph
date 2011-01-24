var vows = require('vows'),
    assert = require('assert'),
    SiteGraph = require('../SiteGraph'),
    transforms = require('../transforms');

vows.describe('Cache manifest').addBatch({
    'After loading a test case with an existing cache manifest': {
        topic: function () {
            var callback = this.callback,
                siteGraph = new SiteGraph({root: __dirname + '/cacheManifest/existingCacheManifest/'});
            siteGraph.loadAsset('index.html', function (err, htmlAsset) {
                if (err) {
                    return callback(err);
                }
                siteGraph.populate(htmlAsset, function () {return true;}, function (err) {
                    if (err) {
                        return callback(err);
                    }
                    callback(null, siteGraph);
                });
            });
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
            var callback = this.callback,
                siteGraph = new SiteGraph({root: __dirname + '/cacheManifest/noCacheManifest/'});
            siteGraph.loadAsset('index.html', function (err, htmlAsset) {
                if (err) {
                    return callback(err);
                }
                siteGraph.populate(htmlAsset, function () {return true;}, callback);
            });
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
