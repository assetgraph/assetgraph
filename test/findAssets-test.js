var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph');

vows.describe('AssetGraph.findAssets').addBatch({
    'Load test case': {
        topic: function () {
            new AssetGraph()
                .loadAssets(
                    new AssetGraph.Html({text: 'a', foo: 'bar'}),
                    new AssetGraph.Html({text: 'b', foo: 'bar'}),
                    new AssetGraph.Html({text: 'c', foo: 'quux'}),
                    new AssetGraph.Css({text: 'd', foo: 'baz'}),
                    new AssetGraph.Css({text: 'e'}),
                    new AssetGraph.Htc({text: 'f', foo: 'baz'})
                )
                .run(this.callback);
        },
        'then lookup single value of unindexed property': function (assetGraph) {
            assert.equal(assetGraph.findAssets({foo: 'bar'}).length, 2);
            assert.equal(assetGraph.findAssets({foo: 'baz'}).length, 2);
            assert.equal(assetGraph.findAssets({foo: 'quux'}).length, 1);
            assert.equal(assetGraph.findAssets({foo: ['quux']}).length, 1);
            assert.equal(assetGraph.findAssets({foo: function (val) {return typeof val === 'undefined';}}).length, 1);
        },
        'then lookup multiple values of unindexed property': function (assetGraph) {
            assert.equal(assetGraph.findAssets({foo: ['bar', 'quux']}).length, 3);
            assert.equal(assetGraph.findAssets({foo: ['bar', 'baz']}).length, 4);
            assert.equal(assetGraph.findAssets({foo: AssetGraph.query.or('quux', function (val) {return typeof val === 'undefined';})}).length, 2);
        },
        'then lookup single value of indexed property': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html'}).length, 3);
            assert.equal(assetGraph.findAssets({type: 'Css'}).length, 2);
            assert.equal(assetGraph.findAssets({type: 'Htc'}).length, 1);
        },
        'then lookup multiple values of indexed property': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: ['Css', 'Html']}).length, 5);
            assert.equal(assetGraph.findAssets({type: ['Htc', 'Css', 'Html']}).length, 6);
            assert.equal(assetGraph.findAssets({type: ['Htc', 'Html']}).length, 4);
            assert.equal(assetGraph.findAssets({type: ['Css', 'Htc']}).length, 3);
        },
        'then lookup multiple properties': function (assetGraph) {
            assert.equal(assetGraph.findAssets({foo: 'baz', type: 'Css'}).length, 1);
            assert.equal(assetGraph.findAssets({foo: 'bar', type: 'Html'}).length, 2);
            assert.equal(assetGraph.findAssets({foo: 'quux', type: 'Htc'}).length, 0);
        },
        'then lookup based on incoming relations': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html', incoming: {type: 'HtmlAnchor'}}).length, 0);
        },
        'then lookup based on outgoing relations': function (assetGraph) {
            assert.equal(assetGraph.findAssets({outgoing: {type: 'HtmlAnchor'}}).length, 0);
        },
        'then add some relations to the graph': {
            topic: function (assetGraph) {
                assetGraph.addRelation(new AssetGraph.HtmlAnchor({
                    from: assetGraph.findAssets({text: 'a'})[0],
                    to: assetGraph.findAssets({text: 'b'})[0]
                }));
                assetGraph.addRelation(new AssetGraph.HtmlAnchor({ // Identical to the first
                    from: assetGraph.findAssets({text: 'a'})[0],
                    to: assetGraph.findAssets({text: 'b'})[0]
                }));
                assetGraph.addRelation(new AssetGraph.HtmlAnchor({
                    from: assetGraph.findAssets({text: 'a'})[0],
                    to: assetGraph.findAssets({text: 'c'})[0]
                }));
                assetGraph.addRelation(new AssetGraph.CssImage({
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
