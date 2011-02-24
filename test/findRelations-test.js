var URL = require('url'),
    vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = require('../lib/transforms'),
    assets = require('../lib/assets'),
    relations = require('../lib/relations'),
    query = require('../lib/query'),
    step = require('step');

vows.describe('AssetGraph.findAssets').addBatch({
    'Load test case': {
        topic: function () {
            new AssetGraph().transform(
                transforms.loadAssets(
                    {type: 'HTML', originalSrc: 'a', foo: 'bar'},
                    {type: 'HTML', originalSrc: 'b', foo: 'bar'},
                    {type: 'HTML', originalSrc: 'c', foo: 'quux'},
                    {type: 'CSS',  originalSrc: 'd', foo: 'baz'},
                    {type: 'CSS',  originalSrc: 'e'},
                    {type: 'PNG',  originalSrc: 'f', foo: 'baz'}
                ),
                function (err, assetGraph, cb) {
                    assetGraph.addRelation(new relations.HTMLStyle({
                        from: assetGraph.findAssets({originalSrc: 'a'})[0],
                        to: assetGraph.findAssets({originalSrc: 'd'})[0]
                    }));
                    assetGraph.addRelation(new relations.HTMLAnchor({
                        from: assetGraph.findAssets({originalSrc: 'a'})[0],
                        to: assetGraph.findAssets({originalSrc: 'b'})[0]
                    }));
                    assetGraph.addRelation(new relations.HTMLAnchor({
                        from: assetGraph.findAssets({originalSrc: 'a'})[0],
                        to: assetGraph.findAssets({originalSrc: 'c'})[0]
                    }));
                    assetGraph.addRelation(new relations.HTMLAnchor({
                        from: assetGraph.findAssets({originalSrc: 'b'})[0],
                        to: assetGraph.findAssets({originalSrc: 'c'})[0]
                    }));
                    assetGraph.addRelation(new relations.HTMLStyle({
                        from: assetGraph.findAssets({originalSrc: 'b'})[0],
                        to: assetGraph.findAssets({originalSrc: 'e'})[0]
                    }));
                    assetGraph.addRelation(new relations.CSSBackgroundImage({
                        from: assetGraph.findAssets({originalSrc: 'd'})[0],
                        to: assetGraph.findAssets({originalSrc: 'f'})[0]
                    }));
                    assetGraph.addRelation(new relations.CSSBackgroundImage({
                        from: assetGraph.findAssets({originalSrc: 'e'})[0],
                        to: assetGraph.findAssets({originalSrc: 'f'})[0]
                    }));
                    process.nextTick(cb);
                },
                this.callback
            );
        },
        'and lookup relations by a single indexed property': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'CSSBackgroundImage'}).length, 2);
        },
        'and lookup relations by multiple indexed properties': function (assetGraph) {
            assert.equal(assetGraph.findRelations({
                type: 'HTMLAnchor',
                from: assetGraph.findAssets({originalSrc: 'a'})[0]
            }).length, 2);
        },
        'and lookup relations by structured query': function (assetGraph) {
            assert.equal(assetGraph.findRelations({
                type: 'HTMLAnchor',
                to: {
                    originalSrc: 'c',
                    foo: 'quux'
                }
            }).length, 2);
        },
        'and lookup relations by structured query with arrays': function (assetGraph) {
            assert.equal(assetGraph.findRelations({
                type: ['HTMLAnchor', 'HTMLStyle'],
                from: {
                    originalSrc: ['a', 'b']
                },
                to: {
                    type: ['HTML', 'CSS']
                }
            }).length, 5);
        },
        'and lookup relations by structured query with regexps': function (assetGraph) {
            assert.equal(assetGraph.findRelations({
                type: /CSSBack|HTMLAn/,
                from: {
                    originalSrc: /^[ad]$/
                }
            }).length, 3);
            assert.equal(assetGraph.findRelations({
                type: /Style/,
                from: {
                    originalSrc: /^a$/
                }
            }).length, 1);
        },
        'and lookup relations by negative match': function (assetGraph) {
            assert.equal(assetGraph.findRelations({
                type: query.not('CSSBackgroundImage'),
                from: {
                    originalSrc: query.not('a')
                }
            }).length, 2);
        },
        'and lookup relations using query.defined': function (assetGraph) {
            assert.equal(assetGraph.findRelations({
                from: {
                    foo: query.defined
                }
            }).length, 6);
            assert.equal(assetGraph.findRelations({
                from: {
                    foo: query.undefined
                }
            }).length, 1);
        }
    }
})['export'](module);
