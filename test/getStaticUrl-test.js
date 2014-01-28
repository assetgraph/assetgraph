var vows = require('vows'),
    assert = require('assert'),
    urlTools = require('urltools'),
    AssetGraph = require('../lib');

vows.describe('getStaticUrl in JavaScript asset').addBatch({
    'After loading test case with a wildcard getStaticUrl': {
        topic: function () {
            new AssetGraph({root: __dirname + '/getStaticUrl/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain a single JavaScript asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 1);
        },
        'the graph should contain 3 JavaScriptGetStaticUrl relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'JavaScriptGetStaticUrl'}).length, 3);
        },
        'the graph should contain 3 StaticUrlMap assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'StaticUrlMap'}).length, 3);
        },
        'the graph should contain 9 StaticUrlMapEntry relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'StaticUrlMapEntry'}).length, 9);
        },
        'the graph should contain 4 Json assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Json'}).length, 4);
        },
        'the StaticUrlMapEntry relations should have the right hrefs': function (assetGraph) {
            assert.equal(assetGraph.findRelations({href: 'json/a.json'}).length, 2);
            assert.equal(assetGraph.findRelations({href: 'json/b.json'}).length, 3);
            assert.equal(assetGraph.findRelations({href: 'json/c.json'}).length, 3);
            assert.equal(assetGraph.findRelations({href: 'json/subsubdir/d.json'}).length, 1);
        },
        'then move one of the assets pointed to by a StaticUrlMapEntry relation': {
            topic: function (assetGraph) {
                assetGraph.findAssets({url: /\/a.json/})[0].url = urlTools.resolveUrl(assetGraph.root, 'static/a76a76a7a.json');
                return assetGraph;
            },
            'the resulting JavaScript should map the url correctly': function (assetGraph) {
                var src = assetGraph.findAssets({type: 'JavaScript'})[0].text;
                assert.equal(new Function(src + ';return theThing;')(), 'static/a76a76a7a.json');
                assert.equal(new Function(src + ';return theDoubleStarThing;')(), 'json/subsubdir/d.json');
                assert.equal(new Function(src + ';return theBracketThing;')(), 'json/c.json');
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
                    assert.equal(new Function(src + ';return theThing;')(), 'static/a76a76a7a.json');
                    assert.equal(new Function(src + ';return theDoubleStarThing;')(), 'json/subsubdir/d.json');
                    assert.equal(new Function(src + ';return theBracketThing;')(), 'json/c.json');
               }
            }
        }
    },
    'After loading the test case with a wildcard getStaticUrl again': {
        topic: function () {
            new AssetGraph({root: __dirname + '/getStaticUrl/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
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
                    .run(this.callback);
            },
            'the graph should contain a single JavaScript asset': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 1);
            },
            'the graph should contain 3 JavaScriptGetStaticUrl relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'JavaScriptGetStaticUrl'}).length, 3);
            },
            'the graph should contain 3 StaticUrlMap assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'StaticUrlMap'}).length, 3);
            },
            'the graph should contain 9 StaticUrlMapEntry relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'StaticUrlMapEntry'}).length, 9);
            },
            'the graph should contain 4 Json assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'Json'}).length, 4);
            },
            'the StaticUrlMapEntry relations should have the right hrefs': function (assetGraph) {
                assert.equal(assetGraph.findRelations({href: 'json/a.json'}).length, 2);
                assert.equal(assetGraph.findRelations({href: 'json/b.json'}).length, 3);
                assert.equal(assetGraph.findRelations({href: 'json/c.json'}).length, 3);
                assert.equal(assetGraph.findRelations({href: 'json/subsubdir/d.json'}).length, 1);
            },
            'then move one of the assets pointed to by a JavaScriptGetStaticUrl relation': {
                topic: function (assetGraph) {
                    assetGraph.findAssets({url: /\/a.json/})[0].url = urlTools.resolveUrl(assetGraph.root, 'static/a76a76a7a.json');
                    return assetGraph;
                },
                'the resulting JavaScript should map the url correctly': function (assetGraph) {
                    var src = assetGraph.findAssets({type: 'JavaScript'})[0].text;
                    assert.equal(new Function(src + ';return theThing;')(), 'static/a76a76a7a.json');
                    assert.equal(new Function(src + ';return theDoubleStarThing;')(), 'json/subsubdir/d.json');
                    assert.equal(new Function(src + ';return theBracketThing;')(), 'json/c.json');
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
                        assert.equal(new Function(src + ';return theThing;')(), 'static/a76a76a7a.json');
                        assert.equal(new Function(src + ';return theDoubleStarThing;')(), 'json/subsubdir/d.json');
                        assert.equal(new Function(src + ';return theBracketThing;')(), 'json/c.json');
                    }
                }
            }
        }
    }
})['export'](module);
