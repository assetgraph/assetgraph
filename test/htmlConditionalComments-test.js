var vows = require('vows'),
    assert = require('assert'),
    urlTools = require('../lib/util/urlTools'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = AssetGraph.transforms;

vows.describe('Parsing conditional comments in Html').addBatch({
    'After loading a test case with conditional comments': {
        topic: function () {
            new AssetGraph({root: __dirname + '/htmlConditionalComments/'}).queue(
                transforms.loadAssets('index.html'),
                transforms.populate()
            ).run(this.callback);
        },
        'the graph should contain 9 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 9);
        },
        'then moving the script asset to a different url and getting the Html as text': {
            topic: function (assetGraph) {
                assetGraph.setAssetUrl(assetGraph.findAssets({type: 'JavaScript'})[0], urlTools.resolveUrl(assetGraph.root, 'fixIE6ForTheLoveOfGod.js'));
                assetGraph.getAssetText(assetGraph.findAssets({url: /index\.html$/})[0], this.callback);
            },
            'the conditional comment should still be there and contain the updated <script>': function (src) {
                assert.notEqual(src.indexOf('Good old'), -1);
                assert.notEqual(src.indexOf('<script src="fixIE6ForTheLoveOfGod.js"></script>'), -1);
            },
            'the not-Internet Explorer conditional comment construct should be left alone': function (src) {
                assert.notEqual(src.indexOf('<!--[if !IE]><!-->Not IE<!--<![endif]-->'), -1);
            },
            'then externalizing the Css and JavaScript and minifying the Html': {
                topic: function (_, assetGraph) {
                    assetGraph.queue(
                        transforms.externalizeRelations({type: ['HtmlStyle', 'HtmlScript']}),
                        transforms.minifyAssets({type: 'Html'})
                    ).run(this.callback);
                },
                'and get the Html as text again': {
                    topic: function (assetGraph) {
                        assetGraph.getAssetText(assetGraph.findAssets({url: /index\.html$/})[0], this.callback);
                    },
                    'the conditional comments should still be there': function (src) {
                        assert.notEqual(src.indexOf('Good old'), -1);
                        assert.notEqual(src.indexOf('<script src="fixIE6ForTheLoveOfGod.js"></script>'), -1);
                        assert.notEqual(src.indexOf('<!--[if !IE]><!-->Not IE<!--<![endif]-->'), -1);
                        assert.isTrue(/<!--\[if IE\]><link rel="stylesheet" href="[^\"]+\.css"><!\[endif\]-->/.test(src));
                    }
                }
            }
        }
    }
})['export'](module);
