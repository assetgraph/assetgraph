var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    urlTools = require('urltools'),
    AssetGraph = require('../lib');

vows.describe('StaticUrlMap test').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/StaticUrlMap/combo/'})
                .loadAssets('index.html')
                .populate()
                .run(done);
        },
        'the graph should contain 2 JavaScriptGetStaticUrl relations': function (assetGraph) {
            expect(assetGraph, 'to contain relations', 'JavaScriptGetStaticUrl', 2);
        },
        'the graph should contain 2 StaticUrlMap assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'StaticUrlMap', 2);
        },
        'the graph should contain 4 StaticUrlMapEntry relations': function (assetGraph) {
            expect(assetGraph, 'to contain relations', 'StaticUrlMapEntry', 4);
        },
        'then move some of the target assets': {
            topic: function (assetGraph) {
                assetGraph.findAssets({type: 'JavaScript', text: 'alert("ac.js");\n'})[0].url = "http://google.com/foo.js";
                assetGraph.findAssets({type: 'Json', parseTree: {iAmQuux: true}})[0].url = urlTools.resolveUrl(assetGraph.root, 'anotherquux.json');
                return assetGraph;
            },
            'the text of the inline JavaScript should be updated accordingly': function (assetGraph) {
                expect(assetGraph.findAssets({type: 'JavaScript', isInline: true})[0].text, 'to match', /google\.com/);
                expect(assetGraph.findAssets({type: 'JavaScript', isInline: true})[0].text, 'to match', /anotherquux.json/);
            }
        }

    },
    'After loading a complex test case with a multi-level GETSTATICURL construct': {
        topic: function () {
            new AssetGraph({root: __dirname + '/StaticUrlMap/multiLevel'})
                .loadAssets('index.html')
                .populate()
                .run(done);
        },
        'the graph should contain one JavaScriptGetStaticUrl relation': function (assetGraph) {
            expect(assetGraph, 'to contain relation', 'JavaScriptGetStaticUrl');
        },
        'the graph should contain one StaticUrlMap asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'StaticUrlMap');
        },
        'the graph should contain 502 StaticUrlMapEntry relations': function (assetGraph) {
            expect(assetGraph, 'to contain relations including unresolved', 'StaticUrlMapEntry', 502);
        },
        'then reparse the JavaScript asset and populate again': {
            topic: function (assetGraph) {
                var javaScript = assetGraph.findAssets({type: 'JavaScript'})[0];
                javaScript.text = javaScript.text;
                return assetGraph;
            },
            'the graph should contain 502 StaticUrlMapEntry relations': function (assetGraph) {
                expect(assetGraph, 'to contain relations including unresolved', 'StaticUrlMapEntry', 502);
            }
        }
    }

})['export'](module);
