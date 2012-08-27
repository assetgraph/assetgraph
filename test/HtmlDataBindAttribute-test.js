var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph');

vows.describe('HtmlDataBindAttribute test').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlDataBindAttribute/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 2 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 2);
        },
        'the graph should contain 1 Html asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html'}).length, 1);
        },
        'the graph should contain 1 HtmlDataBindAttribute relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlDataBindAttribute'}).length, 1);
        },
        'then manipulating the inline JavaScript': {
            topic: function (assetGraph) {
                var javaScript = assetGraph.findAssets({type: 'JavaScript', isInline: true})[0];
                javaScript.parseTree[1][0][1][1].push(['yup', ['string', 'right']]);
                javaScript.markDirty();
                return assetGraph;
            },
            'the text of the Html asset should contain the updated data-bind attribute': function (assetGraph) {
                assert.matches(assetGraph.findAssets({type: 'Html'})[0].text, /yup/);
            }
        }
    }
})['export'](module);
