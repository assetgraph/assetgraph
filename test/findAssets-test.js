var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib');

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
            expect(assetGraph, 'to contain assets', {foo: 'bar'}, 2);
            expect(assetGraph, 'to contain assets', {foo: 'baz'}, 2);
            expect(assetGraph, 'to contain asset', {foo: 'quux'});
            expect(assetGraph, 'to contain asset', {foo: ['quux']});
            expect(assetGraph, 'to contain asset', {foo: function (val) {return typeof val === 'undefined';}});
        },
        'then lookup multiple values of unindexed property': function (assetGraph) {
            expect(assetGraph, 'to contain assets', {foo: ['bar', 'quux']}, 3);
            expect(assetGraph, 'to contain assets', {foo: ['bar', 'baz']}, 4);
            expect(assetGraph, 'to contain assets', {foo: AssetGraph.query.or('quux', function (val) {return typeof val === 'undefined';})}, 2);
        },
        'then lookup single value of indexed property': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'Html', 3);
            expect(assetGraph, 'to contain assets', 'Css', 2);
            expect(assetGraph, 'to contain asset', 'Htc');
        },
        'then lookup multiple values of indexed property': function (assetGraph) {
            expect(assetGraph, 'to contain assets', {type: ['Css', 'Html']}, 5);
            expect(assetGraph, 'to contain assets', {type: ['Htc', 'Css', 'Html']}, 6);
            expect(assetGraph, 'to contain assets', {type: ['Htc', 'Html']}, 4);
            expect(assetGraph, 'to contain assets', {type: ['Css', 'Htc']}, 3);
        },
        'then lookup multiple properties': function (assetGraph) {
            expect(assetGraph, 'to contain asset', {foo: 'baz', type: 'Css'});
            expect(assetGraph, 'to contain assets', {foo: 'bar', type: 'Html'}, 2);
            expect(assetGraph, 'to contain no assets', {foo: 'quux', type: 'Htc'});
        },
        'then lookup based on incoming relations': function (assetGraph) {
            expect(assetGraph, 'to contain no assets', {type: 'Html', incoming: {type: 'HtmlAnchor'}});
        },
        'then lookup based on outgoing relations': function (assetGraph) {
            expect(assetGraph, 'to contain no assets', {outgoing: {type: 'HtmlAnchor'}});
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
                expect(assetGraph, 'to contain assets', {type: 'Html', incoming: {type: 'HtmlAnchor'}}, 2);
                expect(assetGraph, 'to contain assets', {incoming: {type: 'HtmlAnchor'}}, 2);
            },
            'then lookup based on outgoing relations': function (assetGraph) {
                expect(assetGraph, 'to contain asset', {outgoing: {type: 'HtmlAnchor'}});
                expect(assetGraph, 'to contain asset', {outgoing: {to: {text: 'f'}}});
            }
        }
    }
})['export'](module);
