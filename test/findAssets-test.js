var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = AssetGraph.transforms,
    relations = AssetGraph.relations,
    assets = AssetGraph.assets,
    query = AssetGraph.query;

vows.describe('AssetGraph.findAssets').addBatch({
    'Load test case': {
        topic: function () {
            new AssetGraph().queue(
                transforms.loadAssets(
                    new assets.HTML({decodedSrc: 'a', foo: 'bar'}),
                    new assets.HTML({decodedSrc: 'b', foo: 'bar'}),
                    new assets.HTML({decodedSrc: 'c', foo: 'quux'}),
                    new assets.CSS({decodedSrc: 'd', foo: 'baz'}),
                    new assets.CSS({decodedSrc: 'e'}),
                    new assets.PNG({decodedSrc: 'f', foo: 'baz'})
                )
            ).run(this.callback);
        },
        'then lookup single value of unindexed property': function (assetGraph) {
            assert.equal(assetGraph.findAssets({foo: 'bar'}).length, 2);
            assert.equal(assetGraph.findAssets({foo: 'baz'}).length, 2);
            assert.equal(assetGraph.findAssets({foo: 'quux'}).length, 1);
            assert.equal(assetGraph.findAssets({foo: ['quux']}).length, 1);
            assert.equal(assetGraph.findAssets({foo: query.isUndefined}).length, 1);
        },
        'then lookup multiple values of unindexed property': function (assetGraph) {
            assert.equal(assetGraph.findAssets({foo: ['bar', 'quux']}).length, 3);
            assert.equal(assetGraph.findAssets({foo: ['bar', 'baz']}).length, 4);
            assert.equal(assetGraph.findAssets({foo: query.or('quux', query.isUndefined)}).length, 2);
        },
        'then lookup single value of indexed property': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'HTML'}).length, 3);
            assert.equal(assetGraph.findAssets({type: 'CSS'}).length, 2);
            assert.equal(assetGraph.findAssets({type: 'PNG'}).length, 1);
        },
        'then lookup multiple values of indexed property': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: ['CSS', 'HTML']}).length, 5);
            assert.equal(assetGraph.findAssets({type: ['PNG', 'CSS', 'HTML']}).length, 6);
            assert.equal(assetGraph.findAssets({type: ['PNG', 'HTML']}).length, 4);
            assert.equal(assetGraph.findAssets({type: ['CSS', 'PNG']}).length, 3);
        },
        'then lookup multiple properties': function (assetGraph) {
            assert.equal(assetGraph.findAssets({foo: 'baz', type: 'CSS'}).length, 1);
            assert.equal(assetGraph.findAssets({foo: 'bar', type: 'HTML'}).length, 2);
            assert.equal(assetGraph.findAssets({foo: 'quux', type: 'PNG'}).length, 0);
        },
        'then lookup based on incoming relations': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'HTML', incoming: {type: 'HTMLAnchor'}}).length, 0);
        },
        'then lookup based on outgoing relations': function (assetGraph) {
            assert.equal(assetGraph.findAssets({outgoing: {type: 'HTMLAnchor'}}).length, 0);
        },
        'then add some relations to the graph': {
            topic: function (assetGraph) {
                assetGraph.addRelation(new relations.HTMLAnchor({
                    from: assetGraph.findAssets({decodedSrc: 'a'})[0],
                    to: assetGraph.findAssets({decodedSrc: 'b'})[0]
                }));
                assetGraph.addRelation(new relations.HTMLAnchor({ // Identical to the first
                    from: assetGraph.findAssets({decodedSrc: 'a'})[0],
                    to: assetGraph.findAssets({decodedSrc: 'b'})[0]
                }));
                assetGraph.addRelation(new relations.HTMLAnchor({
                    from: assetGraph.findAssets({decodedSrc: 'a'})[0],
                    to: assetGraph.findAssets({decodedSrc: 'c'})[0]
                }));
                assetGraph.addRelation(new relations.CSSImage({
                    from: assetGraph.findAssets({decodedSrc: 'e'})[0],
                    to: assetGraph.findAssets({decodedSrc: 'f'})[0]
                }));
                return assetGraph;
            },
            'then lookup based on incoming relations': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'HTML', incoming: {type: 'HTMLAnchor'}}).length, 2);
                assert.equal(assetGraph.findAssets({incoming: {type: 'HTMLAnchor'}}).length, 2);
            },
            'then lookup based on outgoing relations': function (assetGraph) {
                assert.equal(assetGraph.findAssets({outgoing: {type: 'HTMLAnchor'}}).length, 1);
                assert.equal(assetGraph.findAssets({outgoing: {to: {decodedSrc: 'f'}}}).length, 1);
            }
        }
    }
})['export'](module);
