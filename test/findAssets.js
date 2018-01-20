/*global describe, it*/
const expect = require('./unexpected-with-plugins');
const AssetGraph = require('../lib/AssetGraph');

describe('AssetGraph.findAssets', function () {
    it('should handle a test case with 6 assets', async function () {
        const assetGraph = new AssetGraph();
        await assetGraph.loadAssets(
            new AssetGraph().addAsset({type: 'Html', text: 'a', foo: 'bar', url: 'https://example.com/a'}),
            new AssetGraph().addAsset({type: 'Html', text: 'b', foo: 'bar', url: 'https://example.com/b'}),
            new AssetGraph().addAsset({type: 'Html', text: 'c', foo: 'quux', url: 'https://example.com/c'}),
            new AssetGraph().addAsset({type: 'Css', text: 'body { color: #ddd; }', foo: 'baz', url: 'https://example.com/d'}),
            new AssetGraph().addAsset({type: 'Css', text: 'body { color: #eee; }', url: 'https://example.com/e'}),
            new AssetGraph().addAsset({type: 'Htc', text: 'f', foo: 'baz', url: 'https://example.com/f'})
        );

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

        // FIXME: "node: false" is to prevent it Asset#addRelation from
        // attempting to attach the anchors, which will fail because
        // HtmlRelation#attachNodeBeforeOrAfter requires 'before' or 'after'
        // and an adjacent node, which we don't have here.
        // The test sidestepped this problem before by not calling
        // Relation#attach, but that's now a side effect of Asset#addRelation
        // if the relation does not have a node property already.
        const aHtml = assetGraph.findAssets({text: 'a'})[0];
        aHtml.addRelation({
            type: 'HtmlAnchor',
            to: assetGraph.findAssets({text: 'b'})[0]
        }, 'last');
        aHtml.addRelation({ // Identical to the first
            type: 'HtmlAnchor',
            to: assetGraph.findAssets({text: 'b'})[0]
        }, 'last');
        aHtml.addRelation({
            type: 'HtmlAnchor',
            to: assetGraph.findAssets({text: 'c'})[0]
        }, 'last');

        expect(assetGraph, 'to contain assets', {type: 'Html', incoming: {type: 'HtmlAnchor'}}, 2);
        expect(assetGraph, 'to contain assets', {incoming: {type: 'HtmlAnchor'}}, 2);

        expect(assetGraph, 'to contain asset', {outgoing: {type: 'HtmlAnchor'}});
    });
});
