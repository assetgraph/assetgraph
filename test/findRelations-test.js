var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib'),
    query = AssetGraph.query;

vows.describe('AssetGraph.findAssets').addBatch({
    'Load test case': {
        topic: function () {
            new AssetGraph()
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
                        assetGraph.addRelation(new AssetGraph.HtmlStyle({
                            from: assetGraph.findAssets({text: 'a'})[0],
                            to: assetGraph.findAssets({text: 'd'})[0]
                        }));
                        assetGraph.addRelation(new AssetGraph.HtmlAnchor({
                            from: assetGraph.findAssets({text: 'a'})[0],
                            to: assetGraph.findAssets({text: 'b'})[0]
                        }));
                        assetGraph.addRelation(new AssetGraph.HtmlAnchor({
                            from: assetGraph.findAssets({text: 'a'})[0],
                            to: assetGraph.findAssets({text: 'c'})[0]
                        }));
                        assetGraph.addRelation(new AssetGraph.HtmlAnchor({
                            from: assetGraph.findAssets({text: 'b'})[0],
                            to: assetGraph.findAssets({text: 'c'})[0]
                        }));
                        assetGraph.addRelation(new AssetGraph.HtmlStyle({
                            from: assetGraph.findAssets({text: 'b'})[0],
                            to: assetGraph.findAssets({text: 'e'})[0]
                        }));
                        assetGraph.addRelation(new AssetGraph.CssImage({
                            from: assetGraph.findAssets({text: 'd'})[0],
                            to: assetGraph.findAssets({rawSrc: new Buffer('f')})[0]
                        }));
                        assetGraph.addRelation(new AssetGraph.CssImage({
                            from: assetGraph.findAssets({text: 'e'})[0],
                            to: assetGraph.findAssets({rawSrc: new Buffer('f')})[0]
                        }));
                    }
                )
                .run(this.callback);
        },
        'and lookup relations by a single indexed property': function (assetGraph) {
            expect(assetGraph, 'to contain relations', 'CssImage', 2);
        },
        'and lookup relations by multiple indexed properties': function (assetGraph) {
            expect(assetGraph, 'to contain relations', {
                type: 'HtmlAnchor',
                from: assetGraph.findAssets({text: 'a'})[0]
            }, 2);
        },
        'and lookup relations by structured query': function (assetGraph) {
            expect(assetGraph, 'to contain relations', {
                type: 'HtmlAnchor',
                to: {
                    text: 'c',
                    foo: 'quux'
                }
            }, 2);
        },
        'and lookup relations by structured query with arrays': function (assetGraph) {
            expect(assetGraph, 'to contain relations', {
                type: ['HtmlAnchor', 'HtmlStyle'],
                from: {
                    text: ['a', 'b']
                },
                to: {
                    type: ['Html', 'Css']
                }
            }, 5);
        },
        'and lookup relations by structured query with regexps': function (assetGraph) {
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
        },
        'and lookup relations by negative match': function (assetGraph) {
            expect(assetGraph, 'to contain relations', {
                type: query.not('CssImage'),
                from: {
                    text: query.not('a')
                }
            }, 2);
        },
        'and lookup relations by definedness': function (assetGraph) {
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
        }
    }
})['export'](module);
