var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib');

vows.describe('HtmlLogo').addBatch({
    'After loading a test case with a <link rel="logo" href="...">': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlLogo/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 1 HtmlLogo relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlLogo'}).length, 1);
        },
        'the graph should contain 1 Svg asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Svg'}).length, 1);
        },
        'then update the url of the logo': {
            topic: function (assetGraph) {
                assetGraph.findAssets({type: 'Svg'})[0].url = 'http://example.com/otherLogo.png';
                return assetGraph;
            },
            'the text of the Html asset should be updated': function (assetGraph) {
                assert.matches(assetGraph.findAssets({type: 'Html'})[0].text, /otherLogo\.png/)
            }
        }
    }
})['export'](module);
