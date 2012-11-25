var vows = require('vows'),
    assert = require('assert'),
    _ = require('underscore'),
    urlTools = require('../lib/util/urlTools'),
    AssetGraph = require('../lib/AssetGraph');

vows.describe('Cache manifest').addBatch({
    'After loading a single-page test case with an existing cache manifest': {
        topic: function () {
            new AssetGraph({root: __dirname + '/CacheManifest/existingCacheManifest/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 4 relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations().length, 4);
        },
        'the graph should contain 4 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 4);
        },
        'the graph contains a single cache manifest': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'CacheManifest'}).length, 1);
        },
        'the cache manifest has an outgoing relation to an image in the FALLBACK section': function (assetGraph) {
            var outgoingRelations = assetGraph.findRelations({from: assetGraph.findAssets({type: 'CacheManifest'})[0]});
            assert.equal(outgoingRelations.length, 1);
            assert.equal(outgoingRelations[0].to.type, 'Png');
            assert.equal(outgoingRelations[0].sectionName, 'FALLBACK');
        },
        'then running the addCacheManifest transform': {
            topic: function (assetGraph) {
                assetGraph.addCacheManifest({isInitial: true}).run(this.callback);
            },
            'there should still be a single cache manifest asset': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'CacheManifest'}).length, 1);
            },
            'the manifest should have a relation to bar.png': function (assetGraph) {
                var manifest = assetGraph.findAssets({type: 'CacheManifest'})[0],
                    barPng = assetGraph.findAssets({
                        url: urlTools.resolveUrl(assetGraph.root, 'bar.png')
                    });
                assert.equal(assetGraph.findRelations({from: manifest, to: barPng}).length, 1); // FIXME: query
            },
            'then get the manifest as text': {
                topic: function (assetGraph) {
                    return assetGraph.findAssets({type: 'CacheManifest'})[0].text;
                },
                'it should only point to foo.png once': function (src) {
                    var fooPngMatches = src.match(/\bfoo.png/gm);
                    assert.isArray(fooPngMatches);
                    assert.equal(fooPngMatches.length, 1);
                },
                'it should still contain the original NETWORK and FALLBACK sections': function (src) {
                    assert.isTrue(src.indexOf("NETWORK:\n# I am a comment\n/helloworld.php\n") !== -1);
                    assert.isTrue(src.indexOf("FALLBACK:\nheresthething.asp foo.png\n") !== -1);
                },
                'then move the foo.png asset to a different url and get the manifest as text again': {
                    topic: function (previousSrc, assetGraph) {
                        assetGraph.findAssets({url: /foo.png$/})[0].url = urlTools.resolveUrl(assetGraph.root, 'somewhere/else/quux.png');
                        return assetGraph.findAssets({type: 'CacheManifest'})[0].text;
                    },
                    'there should be no mention of foo.png': function (src) {
                        assert.isNull(src.match(/\bfoo.png/gm));
                    },
                    'the entry in the FALLBACK section should point at the new url': function (src) {
                        assert.isTrue(src.indexOf("FALLBACK:\nheresthething.asp somewhere/else/quux.png\n") !== -1);
                    }
                }
            }
        }
    },
    'After loading a test case with no manifest': {
        topic: function () {
            new AssetGraph({root: __dirname + '/CacheManifest/noCacheManifest/'})
                .loadAssets('index.html')
                .populate({followRelations: {to: {url: /^file:/}}})
                .run(this.callback);
        },
        'the graph contains 6 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 6);
        },
        'the graph contains 6 relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations().length, 6);
        },
        'the graph contains a single Png asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Png'}).length, 1);
        },
        'the graph contains 2 Html assets, of which one is inline (conditional comment)': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html'}).length, 2);
            assert.equal(assetGraph.findAssets({type: 'Html', isInline: true}).length, 1);
        },
        'the graph contains a single Css asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Css'}).length, 1);
        },
        'the graph contains 2 JavaScript assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 2);
        },
        'then adding a cache manifest to the Html file': {
            topic: function (assetGraph) {
                assetGraph.addCacheManifest({isInitial: true}).run(this.callback);
            },
            'the graph should contain a cache manifest': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'CacheManifest'}).length, 1);
            },
            'the cache manifest should point at the right 3 assets': function (assetGraph) {
                assert.deepEqual(_.pluck(assetGraph.findRelations({from: {type: 'CacheManifest'}}), 'href'), [
                                     'foo.png',
                                     'style.css',
                                     'modernBrowsers.js'
                ]);
            }
        }
    },
    'After loading a multi-page test case with no manifest': {
        topic: function () {
            new AssetGraph({root: __dirname + '/CacheManifest/noCacheManifestMultiPage/'})
                .loadAssets('*.html')
                .populate()
                .run(this.callback);
        },
        'the graph contains 3 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 3);
        },
        'the graph contains 4 relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations().length, 4);
        },
        'the graph contains 1 Png': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Png'}).length, 1);
        },
        'the graph contains 2 Html assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html'}).length, 2);
        },
        'the graph contains an IFrame relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlIFrame'}).length, 1);
        },
        'the graph contains 2 Html image relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlImage'}).length, 2);
        },
        'then adding a cache manifest to each of the Html files': {
            topic: function (assetGraph) {
                assetGraph.addCacheManifest({isInitial: true}).run(this.callback);
            },
            'the graph should contain 2 CacheManifest assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'CacheManifest'}).length, 2);
            },
            'the manifest for index.html should have 2 outgoing relations pointing at foo.png and otherpage.html': function (assetGraph) {
                var cacheManifest = assetGraph.findAssets({type: 'CacheManifest', incoming: {from: {url: /\/index\.html$/}}});
                assert.equal(assetGraph.findRelations({from: cacheManifest}).length, 2);
                assert.equal(assetGraph.findRelations({from: cacheManifest, to: {url: /\/foo\.png$/}}).length, 1);
                assert.equal(assetGraph.findRelations({from: cacheManifest, to: {url: /\/otherpage\.html$/}}).length, 1);
            },
            'the manifest for otherpage.html should have 1 outgoing relation pointing at foo.png': function (assetGraph) {
                var cacheManifest = assetGraph.findAssets({type: 'CacheManifest', incoming: {from: {url: /\/otherpage\.html$/}}});
                assert.equal(assetGraph.findRelations({from: cacheManifest}).length, 1);
                assert.equal(assetGraph.findRelations({from: cacheManifest})[0].to, assetGraph.findAssets({url: /\/foo\.png$/})[0]);
            }
        }
    },
    'After loading a multi-page test case with one existing manifest': {
        topic: function () {
            new AssetGraph({root: __dirname + '/CacheManifest/existingCacheManifestMultiPage/'})
                .loadAssets('*.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain two Html assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html'}).length, 2);
        },
        'the graph should contain a single cache manifest': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'CacheManifest'}).length, 1);
        },
        'the graph should contain a single Css asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Css'}).length, 1);
        },
        'the graph should contain two Png assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Png'}).length, 2);
        },
        'then running the addCacheManifest transform': {
            topic: function (assetGraph) {
                assetGraph.addCacheManifest({isInitial: true}).run(this.callback);
            },
            'the graph should contain two cache manifests': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'CacheManifest'}).length, 2);
            },
            'the cache manifest for pageone.html should now refer to style.css, quux.png, and foo.png': function (assetGraph) {
                var cacheManifest = assetGraph.findAssets({type: 'CacheManifest', incoming: {from: {url: /\/pageone\.html$/}}})[0];
                assert.equal(assetGraph.findRelations({from: cacheManifest}).length, 3);
                assert.equal(assetGraph.findRelations({from: cacheManifest, to: {url: /\/style\.css/}}).length, 1);
                assert.equal(assetGraph.findRelations({from: cacheManifest, to: {url: /\/quux\.png/}}).length, 1);
                assert.equal(assetGraph.findRelations({from: cacheManifest, to: {url: /\/foo\.png/}}).length, 1);
            },
            'the cache manifest for pagetwo.html should now refer to style.css, and quux.png': function (assetGraph) {
                var cacheManifest = assetGraph.findAssets({type: 'CacheManifest', incoming: {from: {url: /\/pagetwo\.html$/}}})[0];
                assert.equal(assetGraph.findRelations({from: cacheManifest}).length, 2);
                assert.equal(assetGraph.findRelations({from: cacheManifest, to: {url: /\/style\.css/}}).length, 1);
                assert.equal(assetGraph.findRelations({from: cacheManifest, to: {url: /\/quux\.png/}}).length, 1);
            }
        }
    }
})['export'](module);
