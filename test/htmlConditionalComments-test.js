var URL = require('url'),
    vows = require('vows'),
    assert = require('assert'),
    step = require('step'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = require('../lib/transforms');

vows.describe('Parsing conditional comments in HTML').addBatch({
    'After loading a test case with conditional comments': {
        topic: function () {
            new AssetGraph({root: __dirname + '/htmlConditionalComments/'}).transform(
                transforms.loadAssets('index.html'),
                transforms.populate(),
                this.callback
            );
        },
        'the graph should contain 3 assets': function (assetGraph) {
            assert.equal(assetGraph.assets.length, 3);
        },
        'then move the script asset to a different url and serialize the HTML': {
            topic: function (assetGraph) {
                assetGraph.setAssetUrl(assetGraph.findAssets({type: 'JavaScript'})[0], assetGraph.resolver.root + 'fixIE6ForTheLoveOfGod.js');
                assetGraph.serializeAsset(assetGraph.findAssets({url: /index\.html$/})[0], this.callback);
            },
            'the conditional comment should still be there and contain the updated <script>': function (src) {
                assert.notEqual(src.indexOf('Good old'), -1);
                assert.notEqual(src.indexOf('<script src="fixIE6ForTheLoveOfGod.js"></script>'), -1);
            },
            'the not-Internet Explorer conditional comment construct should be left alone': function (src) {
                assert.notEqual(src.indexOf('<!--[if !IE]><!--> Not IE <!--<![endif]-->'), -1);
            }
        }
    }
})['export'](module);
