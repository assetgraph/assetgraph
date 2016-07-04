/*global describe, it*/
var expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib'),
    query = AssetGraph.query;

describe('AssetGraph.findAssets', function () {
    it('should handle a simple test case', function () {
        return new AssetGraph()
            .loadAssets(
                new AssetGraph.Html({url: 'a', text: 'a', foo: 'bar'}),
                new AssetGraph.Html({url: 'b', text: 'b', foo: 'bar'}),
                new AssetGraph.Html({url: 'c', text: 'c', foo: 'quux'}),
                new AssetGraph.Css({url: 'd', text: 'd', foo: 'baz'}),
                new AssetGraph.Css({url: 'e', text: 'e'}),
                new AssetGraph.Png({url: 'f', rawSrc: new Buffer('f'), foo: 'baz'})
            )
            .queue(
                function (assetGraph) {
                    assetGraph.findAssets({text: 'a'})[0].addRelation(new AssetGraph.HtmlStyle({
                        to: assetGraph.findAssets({text: 'd'})[0]
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
                        to: assetGraph.findAssets({text: 'e'})[0]
                    }));
                    assetGraph.findAssets({text: 'd'})[0].addRelation(new AssetGraph.CssImage({
                        to: assetGraph.findAssets({rawSrc: new Buffer('f')})[0]
                    }));
                    assetGraph.findAssets({text: 'e'})[0].addRelation(new AssetGraph.CssImage({
                        to: assetGraph.findAssets({rawSrc: new Buffer('f')})[0]
                    }));
                }
            )
            .queue(function (assetGraph) {
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
                        text: /^[ad]$/
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
});
