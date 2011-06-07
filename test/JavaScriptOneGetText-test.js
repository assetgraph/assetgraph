var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = AssetGraph.transforms,
    query = AssetGraph.query;

vows.describe('one.getText').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/JavaScriptOneGetText/'}).queue(
                transforms.loadAssets('index.html.template'),
                transforms.populate(),
                transforms.injectOneBootstrapper({isInitial: true})
            ).run(this.callback);
        },
        'the graph should contain 4 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 4);
        },
        'the graph should contain one JavaScriptOneGetText relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'JavaScriptOneGetText'}).length, 1);
        },
        'then run the inlineJavaScriptOneGetText transform': {
            topic: function (assetGraph) {
                assetGraph.runTransform(transforms.inlineJavaScriptOneGetText(), this.callback);
            },
            'the graph should be down to 3 assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets().length, 3);
            },
            'then get the JavaScript asset as text': {
                topic: function (assetGraph) {
                    assetGraph.getAssetText(assetGraph.findAssets({type: 'JavaScript'})[0], this.callback);
                },
                'the contents of name.txt should have replaced the one.getText expression': function (text) {
                    assert.isTrue(/\"Hello, my name is \"\s*\+\s*\"Foobar/.test(text));
                }
            }
        }
    }
})['export'](module);
