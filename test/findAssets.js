/*global describe, it*/
var expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib/AssetGraph');

describe('AssetGraph.findAssets', function () {
    it('should handle a test case with 6 assets', function (done) {
        new AssetGraph()
            .loadAssets(
                new AssetGraph.Html({text: 'a', foo: 'bar'}),
                new AssetGraph.Html({text: 'b', foo: 'bar'}),
                new AssetGraph.Html({text: 'c', foo: 'quux'}),
                new AssetGraph.Css({text: 'd', foo: 'baz'}),
                new AssetGraph.Css({text: 'e'}),
                new AssetGraph.Htc({text: 'f', foo: 'baz'})
            )
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', {foo: 'bar'}, 2);
                expect(assetGraph, 'to contain assets', {foo: 'baz'}, 2);
                expect(assetGraph, 'to contain asset', {foo: 'quux'});
                expect(assetGraph, 'to contain asset', {foo: ['quux']});
                expect(assetGraph, 'to contain asset', {foo: function (val) {return typeof val === 'undefined';}});

                expect(assetGraph, 'to contain assets', {foo: ['bar', 'quux']}, 3);
                expect(assetGraph, 'to contain assets', {foo: ['bar', 'baz']}, 4);
                expect(assetGraph, 'to contain assets', {foo: AssetGraph.query.or('quux', function (val) {return typeof val === 'undefined';})}, 2);

                expect(assetGraph, 'to contain assets', 'Html', 3);
                expect(assetGraph, 'to contain assets', 'Css', 2);
                expect(assetGraph, 'to contain asset', 'Htc');

                expect(assetGraph, 'to contain assets', {type: ['Css', 'Html']}, 5);
                expect(assetGraph, 'to contain assets', {type: ['Htc', 'Css', 'Html']}, 6);
                expect(assetGraph, 'to contain assets', {type: ['Htc', 'Html']}, 4);
                expect(assetGraph, 'to contain assets', {type: ['Css', 'Htc']}, 3);

                expect(assetGraph, 'to contain asset', {foo: 'baz', type: 'Css'});
                expect(assetGraph, 'to contain assets', {foo: 'bar', type: 'Html'}, 2);
                expect(assetGraph, 'to contain no assets', {foo: 'quux', type: 'Htc'});

                expect(assetGraph, 'to contain no assets', {type: 'Html', incoming: {type: 'HtmlAnchor'}});

                expect(assetGraph, 'to contain no assets', {outgoing: {type: 'HtmlAnchor'}});


                assetGraph.findAssets({text: 'a'})[0].addRelation(new AssetGraph.HtmlAnchor({
                    to: assetGraph.findAssets({text: 'b'})[0]
                }));
                assetGraph.findAssets({text: 'a'})[0].addRelation(new AssetGraph.HtmlAnchor({ // Identical to the first
                    to: assetGraph.findAssets({text: 'b'})[0]
                }));
                assetGraph.findAssets({text: 'a'})[0].addRelation(new AssetGraph.HtmlAnchor({
                    to: assetGraph.findAssets({text: 'c'})[0]
                }));
                assetGraph.findAssets({text: 'e'})[0].addRelation(new AssetGraph.CssImage({
                    to: assetGraph.findAssets({text: 'f'})[0]
                }));

                expect(assetGraph, 'to contain assets', {type: 'Html', incoming: {type: 'HtmlAnchor'}}, 2);
                expect(assetGraph, 'to contain assets', {incoming: {type: 'HtmlAnchor'}}, 2);

                expect(assetGraph, 'to contain asset', {outgoing: {type: 'HtmlAnchor'}});
                expect(assetGraph, 'to contain asset', {outgoing: {to: {text: 'f'}}});
            })
            .run(done);
    });
});
