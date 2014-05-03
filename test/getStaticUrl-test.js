var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    urlTools = require('urltools'),
    AssetGraph = require('../lib');

vows.describe('getStaticUrl in JavaScript asset').addBatch({
    'After loading test case with a wildcard getStaticUrl': {
        topic: function () {
            new AssetGraph({root: __dirname + '/getStaticUrl/'})
                .loadAssets('index.html')
                .populate()
                .run(done);
        },
        'the graph should contain a single JavaScript asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'JavaScript');
        },
        'the graph should contain 3 JavaScriptGetStaticUrl relations': function (assetGraph) {
            expect(assetGraph, 'to contain relations', 'JavaScriptGetStaticUrl', 3);
        },
        'the graph should contain 3 StaticUrlMap assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'StaticUrlMap', 3);
        },
        'the graph should contain 9 StaticUrlMapEntry relations': function (assetGraph) {
            expect(assetGraph, 'to contain relations', 'StaticUrlMapEntry', 9);
        },
        'the graph should contain 4 Json assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'Json', 4);
        },
        'the StaticUrlMapEntry relations should have the right hrefs': function (assetGraph) {
            expect(assetGraph, 'to contain relations', {href: 'json/a.json'}, 2);
            expect(assetGraph, 'to contain relations', {href: 'json/b.json'}, 3);
            expect(assetGraph, 'to contain relations', {href: 'json/c.json'}, 3);
            expect(assetGraph, 'to contain relation', {href: 'json/subsubdir/d.json'});
        },
        'then move one of the assets pointed to by a StaticUrlMapEntry relation': {
            topic: function (assetGraph) {
                assetGraph.findAssets({url: /\/a.json/})[0].url = urlTools.resolveUrl(assetGraph.root, 'static/a76a76a7a.json');
                return assetGraph;
            },
            'the resulting JavaScript should map the url correctly': function (assetGraph) {
                var src = assetGraph.findAssets({type: 'JavaScript'})[0].text;
                expect(new Function(src + ';return theThing;')(), 'to equal', 'static/a76a76a7a.json');
                expect(new Function(src + ';return theDoubleStarThing;')(), 'to equal', 'json/subsubdir/d.json');
                expect(new Function(src + ';return theBracketThing;')(), 'to equal', 'json/c.json');
            },
            'then omit the GETSTATICURL function calls': {
                topic: function (assetGraph) {
                    assetGraph.findRelations({type: 'JavaScriptGetStaticUrl'}).forEach(function (javaScriptGetStaticUrl) {
                        javaScriptGetStaticUrl.omitFunctionCall = true;
                        javaScriptGetStaticUrl.inline();
                    });
                    return assetGraph;
                },
                'the JavaScript should still map the url correctly': function (assetGraph) {
                    var src = assetGraph.findAssets({type: 'JavaScript'})[0].text;
                    expect(new Function(src + ';return theThing;')(), 'to equal', 'static/a76a76a7a.json');
                    expect(new Function(src + ';return theDoubleStarThing;')(), 'to equal', 'json/subsubdir/d.json');
                    expect(new Function(src + ';return theBracketThing;')(), 'to equal', 'json/c.json');
               }
            }
        }
    },
    'After loading the test case with a wildcard getStaticUrl again': {
        topic: function () {
            new AssetGraph({root: __dirname + '/getStaticUrl/'})
                .loadAssets('index.html')
                .populate()
                .run(done);
        },
        'then get the JavaScript asset as text and populate a new graph from it': {
            topic: function (assetGraph) {
                new AssetGraph({root: __dirname + '/getStaticUrl/'})
                    .loadAssets({
                        url: 'file://' + __dirname + '/getStaticUrl/index2.html',
                        type: 'Html',
                        text: "<html><body><script>" + assetGraph.findAssets({type: 'JavaScript'})[0].text + "</script></body></html>"
                    })
                    .populate()
                    .run(done);
            },
            'the graph should contain a single JavaScript asset': function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'JavaScript');
            },
            'the graph should contain 3 JavaScriptGetStaticUrl relations': function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'JavaScriptGetStaticUrl', 3);
            },
            'the graph should contain 3 StaticUrlMap assets': function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'StaticUrlMap', 3);
            },
            'the graph should contain 9 StaticUrlMapEntry relations': function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'StaticUrlMapEntry', 9);
            },
            'the graph should contain 4 Json assets': function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Json', 4);
            },
            'the StaticUrlMapEntry relations should have the right hrefs': function (assetGraph) {
                expect(assetGraph, 'to contain relations', {href: 'json/a.json'}, 2);
                expect(assetGraph, 'to contain relations', {href: 'json/b.json'}, 3);
                expect(assetGraph, 'to contain relations', {href: 'json/c.json'}, 3);
                expect(assetGraph, 'to contain relation', {href: 'json/subsubdir/d.json'});
            },
            'then move one of the assets pointed to by a JavaScriptGetStaticUrl relation': {
                topic: function (assetGraph) {
                    assetGraph.findAssets({url: /\/a.json/})[0].url = urlTools.resolveUrl(assetGraph.root, 'static/a76a76a7a.json');
                    return assetGraph;
                },
                'the resulting JavaScript should map the url correctly': function (assetGraph) {
                    var src = assetGraph.findAssets({type: 'JavaScript'})[0].text;
                    expect(new Function(src + ';return theThing;')(), 'to equal', 'static/a76a76a7a.json');
                    expect(new Function(src + ';return theDoubleStarThing;')(), 'to equal', 'json/subsubdir/d.json');
                    expect(new Function(src + ';return theBracketThing;')(), 'to equal', 'json/c.json');
                },
                'then omit the GETSTATICURL function calls': {
                    topic: function (assetGraph) {
                        assetGraph.findRelations({type: 'JavaScriptGetStaticUrl'}).forEach(function (javaScriptGetStaticUrl) {
                            javaScriptGetStaticUrl.omitFunctionCall = true;
                            javaScriptGetStaticUrl.inline();
                        });
                        return assetGraph;
                    },
                    'the JavaScript should still map the url correctly': function (assetGraph) {
                        var src = assetGraph.findAssets({type: 'JavaScript'})[0].text;
                        expect(new Function(src + ';return theThing;')(), 'to equal', 'static/a76a76a7a.json');
                        expect(new Function(src + ';return theDoubleStarThing;')(), 'to equal', 'json/subsubdir/d.json');
                        expect(new Function(src + ';return theBracketThing;')(), 'to equal', 'json/c.json');
                    }
                }
            }
        }
    }
})['export'](module);
