/*global describe, it*/
const expect = require('./unexpected-with-plugins');
const AssetGraph = require('../lib/AssetGraph');
const query = AssetGraph.query;

describe('AssetGraph.findRelations', function () {
    it('should handle a simple test case', async function () {
        const assetGraph = await new AssetGraph()
        .loadAssets(
            new AssetGraph.Html({url: 'a', text: 'a', foo: 'bar'}),
            new AssetGraph.Html({url: 'b', text: 'b', foo: 'bar'}),
            new AssetGraph.Html({url: 'c', text: 'c', foo: 'quux'}),
            new AssetGraph.Css({url: 'd', text: 'body { color: #ddd; }', foo: 'baz'}),
            new AssetGraph.Css({url: 'e', text: 'body { color: #eee; }'}),
            new AssetGraph.Png({url: 'f', rawSrc: new Buffer('f'), foo: 'baz'})
        );

        assetGraph.findAssets({text: 'a'})[0].addRelation(new AssetGraph.HtmlStyle({
            to: assetGraph.findAssets({text: 'body { color: #ddd; }'})[0]
        }));
        assetGraph.findAssets({text: 'a'})[0].addRelation(new AssetGraph.HtmlAnchor({
            to: assetGraph.findAssets({text: 'b'})[0]
        }));
        assetGraph.findAssets({text: 'a'})[0].addRelation(new AssetGraph.HtmlAnchor({
            to: assetGraph.findAssets({text: 'c'})[0]
        }));
        assetGraph.findAssets({text: 'b'})[0].addRelation(new AssetGraph.HtmlAnchor({
            to: assetGraph.findAssets({text: 'c'})[0]
        }));
        assetGraph.findAssets({text: 'b'})[0].addRelation(new AssetGraph.HtmlStyle({
            to: assetGraph.findAssets({text: 'body { color: #eee; }'})[0]
        }));
        assetGraph.findAssets({text: 'body { color: #ddd; }'})[0].addRelation(new AssetGraph.CssImage({
            to: assetGraph.findAssets({rawSrc: new Buffer('f')})[0]
        }));
        assetGraph.findAssets({text: 'body { color: #eee; }'})[0].addRelation(new AssetGraph.CssImage({
            to: assetGraph.findAssets({rawSrc: new Buffer('f')})[0]
        }));

        expect(assetGraph, 'to contain relations', 'CssImage', 2);
        expect(assetGraph, 'to contain relations', {
            type: 'HtmlAnchor',
            from: assetGraph.findAssets({text: 'a'})[0]
        }, 2);
        expect(assetGraph, 'to contain relations', {
            type: 'HtmlAnchor',
            to: {
                text: 'c',
                foo: 'quux'
            }
        }, 2);
        expect(assetGraph, 'to contain relations', {
            type: ['HtmlAnchor', 'HtmlStyle'],
            from: {
                text: ['a', 'b']
            },
            to: {
                type: ['Html', 'Css']
            }
        }, 5);
        expect(assetGraph, 'to contain relations', {
            type: /CssIm|HtmlAn/,
            from: {
                text: /^a|#ddd/
            }
        }, 3);
        expect(assetGraph, 'to contain relations', {
            type: /Style/,
            from: {
                text: /^a$/
            }
        }, 1);
        expect(assetGraph, 'to contain relations', {
            type: query.not('CssImage'),
            from: {
                text: query.not('a')
            }
        }, 2);
        expect(assetGraph, 'to contain relations', {
            from: {
                foo: function (val) {return typeof val !== 'undefined';}
            }
        }, 6);
        expect(assetGraph, 'to contain relations', {
            from: {
                foo: function (val) {return typeof val === 'undefined';}
            }
        }, 1);
    });
});
