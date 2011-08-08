var vows = require('vows'),
    assert = require('assert'),
    urlTools = require('../lib/util/urlTools'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = AssetGraph.transforms;

vows.describe('getStaticUrl in JavaScript asset').addBatch({
    'After loading test case with a wildcard getStaticUrl': {
        topic: function () {
            new AssetGraph({root: __dirname + '/getStaticUrl/'}).queue(
                transforms.loadAssets('index.html'),
                transforms.populate()
            ).run(this.callback);
        },
        'the graph should contain a single JavaScript asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 1);
        },
        'the graph should contain 3 JavaScriptOneGetStaticUrl relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'JavaScriptOneGetStaticUrl'}).length, 3);
        },
        'the JavaScriptOneGetStaticUrl relations should have the right originalUrl properties': function (assetGraph) {
            assert.equal(assetGraph.findRelations({originalUrl: 'json/a.json'}).length, 1);
            assert.equal(assetGraph.findRelations({originalUrl: 'json/b.json'}).length, 1);
            assert.equal(assetGraph.findRelations({originalUrl: 'json/c.json'}).length, 1);
        },
        'the graph should contain 3 Json assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Json'}).length, 3);
        },
        'then move one of the assets pointed to by a JavaScriptOneGetStaticUrl relation and get the JavaScript asset as text': {
            topic: function (assetGraph) {
                assetGraph.findAssets({url: /\/a.json/})[0].url = urlTools.resolveUrl(assetGraph.root, 'static/a76a76a7a.json');
                return assetGraph.findAssets({type: 'JavaScript'})[0].text;
            },
            'the resulting JavaScript should map the url correctly': function (src) {
                assert.equal(new Function(src + 'return theThing;')(), 'static/a76a76a7a.json');
            }
        }
    },
    'After loading test case with a wildcard getStaticUrl': {
        topic: function () {
            new AssetGraph({root: __dirname + '/getStaticUrl/'}).queue(
                transforms.loadAssets('index.html'),
                transforms.populate()
            ).run(this.callback);
        },
        'then get the JavaScript asset as text and populate a new graph from it': {
            topic: function (assetGraph) {
                new AssetGraph({root: __dirname + '/getStaticUrl/'}).queue(
                    transforms.loadAssets({
                        url: 'file://' + __dirname + '/getStaticUrl/index2.html',
                        type: 'Html',
                        text: "<html><body><script>" + assetGraph.findAssets({type: 'JavaScript'})[0].text + "</script></body></html>"
                    }),
                    transforms.populate()
                ).run(this.callback);
            },
            'the graph should contain a single JavaScript asset': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 1);
            },
            'the graph should contain 3 JavaScriptOneGetStaticUrl relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'JavaScriptOneGetStaticUrl'}).length, 3);
            },
            'the JavaScriptOneGetStaticUrl relations should have the right originalUrl properties': function (assetGraph) {
                assert.equal(assetGraph.findRelations({originalUrl: 'json/a.json'}).length, 1);
                assert.equal(assetGraph.findRelations({originalUrl: 'json/b.json'}).length, 1);
                assert.equal(assetGraph.findRelations({originalUrl: 'json/c.json'}).length, 1);
            },
            'the graph should contain 3 Json assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'Json'}).length, 3);
            },
            'then move one of the assets pointed to by a JavaScriptOneGetStaticUrl relation and get the JavaScript asset as text': {
                topic: function (assetGraph) {
                    assetGraph.findAssets({url: /\/a.json/})[0].url = urlTools.resolveUrl(assetGraph.root, 'static/a76a76a7a.json');
                    return assetGraph.findAssets({type: 'JavaScript'})[0].text;
                },
                'the resulting JavaScript should map the url correctly': function (src) {
                    assert.equal(new Function(src + ';return theThing;')(), 'static/a76a76a7a.json');
                }
            }
        }
    }
})['export'](module);
