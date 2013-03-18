var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph');

vows.describe('HtmlInlineEventHandler test').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlInlineEventHandler/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 4 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 4);
        },
        'the graph should contain 1 Html asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html'}).length, 1);
        },
        'the graph should contain 3 JavaScript assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 3);
        },
        'the graph should contain 3 HtmlInlineEventHandler relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlInlineEventHandler'}).length, 3);
        },
        'then update the text of each JavaScript asset': {
            topic: function (assetGraph) {
                assetGraph.findAssets({type: 'JavaScript'}).forEach(function (javaScript) {
                    javaScript.text = javaScript.text.replace(/this/g, 'that');
                });
                return assetGraph;
            },
            'the Html should be updated': function (assetGraph) {
                assert.matches(assetGraph.findAssets({type: 'Html'})[0].text, /that\.focused.*that\.focused/);
            }
        }
    }
})['export'](module);
