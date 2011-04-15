var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = require('../lib/transforms'),
    assets = require('../lib/assets'),
    relations = require('../lib/relations'),
    query = require('../lib/query');

vows.describe('AssetGraph.findAssets').addBatch({
    'Load test case': {
        topic: function () {
            new AssetGraph().transform(
                transforms.loadAssets(
                    {type: 'HTML', url: 'a', rawSrc: 'a', foo: 'bar'},
                    {type: 'HTML', url: 'b', rawSrc: 'b', foo: 'bar'},
                    {type: 'HTML', url: 'c', rawSrc: 'c', foo: 'quux'},
                    {type: 'CSS',  url: 'd', rawSrc: 'd', foo: 'baz'},
                    {type: 'CSS',  url: 'e', rawSrc: 'e'},
                    {type: 'PNG',  url: 'f', rawSrc: 'f', foo: 'baz'}
                ),
                function (err, assetGraph, cb) {
                    assetGraph.addRelation(new relations.HTMLStyle({
                        from: assetGraph.findAssets({rawSrc: 'a'})[0],
                        to: assetGraph.findAssets({rawSrc: 'd'})[0]
                    }));
                    assetGraph.addRelation(new relations.HTMLAnchor({
                        from: assetGraph.findAssets({rawSrc: 'a'})[0],
                        to: assetGraph.findAssets({rawSrc: 'b'})[0]
                    }));
                    assetGraph.addRelation(new relations.HTMLAnchor({
                        from: assetGraph.findAssets({rawSrc: 'a'})[0],
                        to: assetGraph.findAssets({rawSrc: 'c'})[0]
                    }));
                    assetGraph.addRelation(new relations.HTMLAnchor({
                        from: assetGraph.findAssets({rawSrc: 'b'})[0],
                        to: assetGraph.findAssets({rawSrc: 'c'})[0]
                    }));
                    assetGraph.addRelation(new relations.HTMLStyle({
                        from: assetGraph.findAssets({rawSrc: 'b'})[0],
                        to: assetGraph.findAssets({rawSrc: 'e'})[0]
                    }));
                    assetGraph.addRelation(new relations.CSSImage({
                        from: assetGraph.findAssets({rawSrc: 'd'})[0],
                        to: assetGraph.findAssets({rawSrc: 'f'})[0]
                    }));
                    assetGraph.addRelation(new relations.CSSImage({
                        from: assetGraph.findAssets({rawSrc: 'e'})[0],
                        to: assetGraph.findAssets({rawSrc: 'f'})[0]
                    }));
                    process.nextTick(cb);
                },
                this.callback
            );
        },
        'and lookup relations by a single indexed property': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'CSSImage'}).length, 2);
        },
        'and lookup relations by multiple indexed properties': function (assetGraph) {
            assert.equal(assetGraph.findRelations({
                type: 'HTMLAnchor',
                from: assetGraph.findAssets({rawSrc: 'a'})[0]
            }).length, 2);
        },
        'and lookup relations by structured query': function (assetGraph) {
            assert.equal(assetGraph.findRelations({
                type: 'HTMLAnchor',
                to: {
                    rawSrc: 'c',
                    foo: 'quux'
                }
            }).length, 2);
        },
        'and lookup relations by structured query with arrays': function (assetGraph) {
            assert.equal(assetGraph.findRelations({
                type: ['HTMLAnchor', 'HTMLStyle'],
                from: {
                    rawSrc: ['a', 'b']
                },
                to: {
                    type: ['HTML', 'CSS']
                }
            }).length, 5);
        },
        'and lookup relations by structured query with regexps': function (assetGraph) {
            assert.equal(assetGraph.findRelations({
                type: /CSSIm|HTMLAn/,
                from: {
                    rawSrc: /^[ad]$/
                }
            }).length, 3);
            assert.equal(assetGraph.findRelations({
                type: /Style/,
                from: {
                    rawSrc: /^a$/
                }
            }).length, 1);
        },
        'and lookup relations by negative match': function (assetGraph) {
            assert.equal(assetGraph.findRelations({
                type: query.not('CSSImage'),
                from: {
                    rawSrc: query.not('a')
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
