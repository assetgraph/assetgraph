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
                    new assets.Html({text: 'a', foo: 'bar'}),
                    new assets.Html({text: 'b', foo: 'bar'}),
                    new assets.Html({text: 'c', foo: 'quux'}),
                    new assets.Css({text: 'd', foo: 'baz'}),
                    new assets.Css({text: 'e'}),
                    new assets.Png({text: 'f', foo: 'baz'})
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
            assert.equal(assetGraph.findAssets({type: 'Html'}).length, 3);
            assert.equal(assetGraph.findAssets({type: 'Css'}).length, 2);
            assert.equal(assetGraph.findAssets({type: 'Png'}).length, 1);
        },
        'then lookup multiple values of indexed property': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: ['Css', 'Html']}).length, 5);
            assert.equal(assetGraph.findAssets({type: ['Png', 'Css', 'Html']}).length, 6);
            assert.equal(assetGraph.findAssets({type: ['Png', 'Html']}).length, 4);
            assert.equal(assetGraph.findAssets({type: ['Css', 'Png']}).length, 3);
        },
        'then lookup multiple properties': function (assetGraph) {
            assert.equal(assetGraph.findAssets({foo: 'baz', type: 'Css'}).length, 1);
            assert.equal(assetGraph.findAssets({foo: 'bar', type: 'Html'}).length, 2);
            assert.equal(assetGraph.findAssets({foo: 'quux', type: 'Png'}).length, 0);
        },
        'then lookup based on incoming relations': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html', incoming: {type: 'HtmlAnchor'}}).length, 0);
        },
        'then lookup based on outgoing relations': function (assetGraph) {
            assert.equal(assetGraph.findAssets({outgoing: {type: 'HtmlAnchor'}}).length, 0);
        },
        'then add some relations to the graph': {
            topic: function (assetGraph) {
                assetGraph.addRelation(new relations.HtmlAnchor({
                    from: assetGraph.findAssets({text: 'a'})[0],
                    to: assetGraph.findAssets({text: 'b'})[0]
                }));
                assetGraph.addRelation(new relations.HtmlAnchor({ // Identical to the first
                    from: assetGraph.findAssets({text: 'a'})[0],
                    to: assetGraph.findAssets({text: 'b'})[0]
                }));
                assetGraph.addRelation(new relations.HtmlAnchor({
                    from: assetGraph.findAssets({text: 'a'})[0],
                    to: assetGraph.findAssets({text: 'c'})[0]
                }));
                assetGraph.addRelation(new relations.CssImage({
                    from: assetGraph.findAssets({text: 'e'})[0],
                    to: assetGraph.findAssets({text: 'f'})[0]
                }));
                return assetGraph;
            },
            'then lookup based on incoming relations': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'Html', incoming: {type: 'HtmlAnchor'}}).length, 2);
                assert.equal(assetGraph.findAssets({incoming: {type: 'HtmlAnchor'}}).length, 2);
            },
            'then lookup based on outgoing relations': function (assetGraph) {
                assert.equal(assetGraph.findAssets({outgoing: {type: 'HtmlAnchor'}}).length, 1);
                assert.equal(assetGraph.findAssets({outgoing: {to: {text: 'f'}}}).length, 1);
            }
        }
    }
})['export'](module);
