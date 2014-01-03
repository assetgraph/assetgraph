var vows = require('vows'),
    assert = require('assert'),
    urlTools = require('url-tools'),
    AssetGraph = require('../lib/AssetGraph');

vows.describe('StaticUrlMap test').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/StaticUrlMap/combo/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 2 JavaScriptGetStaticUrl relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'JavaScriptGetStaticUrl'}).length, 2);
        },
        'the graph should contain 2 StaticUrlMap assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'StaticUrlMap'}).length, 2);
        },
        'the graph should contain 4 StaticUrlMapEntry relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'StaticUrlMapEntry'}).length, 4);
        },
        'then move some of the target assets': {
            topic: function (assetGraph) {
                assetGraph.findAssets({type: 'JavaScript', text: 'alert("ac.js");\n'})[0].url = "http://google.com/foo.js";
                assetGraph.findAssets({type: 'Json', parseTree: {iAmQuux: true}})[0].url = urlTools.resolveUrl(assetGraph.root, 'anotherquux.json');
                return assetGraph;
            },
            'the text of the inline JavaScript should be updated accordingly': function (assetGraph) {
                assert.matches(assetGraph.findAssets({type: 'JavaScript', isInline: true})[0].text, /google\.com/);
                assert.matches(assetGraph.findAssets({type: 'JavaScript', isInline: true})[0].text, /anotherquux.json/);
            }
        }

    },
    'After loading a complex test case with a multi-level GETSTATICURL construct': {
        topic: function () {
            new AssetGraph({root: __dirname + '/StaticUrlMap/multiLevel'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain one JavaScriptGetStaticUrl relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'JavaScriptGetStaticUrl'}).length, 1);
        },
        'the graph should contain one StaticUrlMap asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'StaticUrlMap'}).length, 1);
        },
        'the graph should contain 502 StaticUrlMapEntry relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'StaticUrlMapEntry'}, true).length, 502);
        },
        'then reparse the JavaScript asset and populate again': {
            topic: function (assetGraph) {
                var javaScript = assetGraph.findAssets({type: 'JavaScript'})[0];
                javaScript.text = javaScript.text;
                return assetGraph;
            },
            'the graph should contain 502 StaticUrlMapEntry relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'StaticUrlMapEntry'}, true).length, 502);
            }
        }
    }

})['export'](module);
