var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = require('../lib/transforms');

vows.describe('Parsing conditional comments in HTML').addBatch({
    'After loading a test case with conditional comments': {
        topic: function () {
            new AssetGraph({root: __dirname + '/htmlConditionalComments/'}).queue(
                transforms.loadAssets('index.html'),
                transforms.populate()
            ).run(this.callback);
        },
        'the graph should contain 9 assets': function (assetGraph) {
            assert.equal(assetGraph.assets.length, 9);
        },
        'then moving the script asset to a different url and getting the HTML as text': {
            topic: function (assetGraph) {
                assetGraph.setAssetUrl(assetGraph.findAssets({type: 'JavaScript'})[0], assetGraph.resolver.root + 'fixIE6ForTheLoveOfGod.js');
                assetGraph.getAssetText(assetGraph.findAssets({url: /index\.html$/})[0], this.callback);
            },
            'the conditional comment should still be there and contain the updated <script>': function (src) {
                assert.notEqual(src.indexOf('Good old'), -1);
                assert.notEqual(src.indexOf('<script src="fixIE6ForTheLoveOfGod.js"></script>'), -1);
            },
            'the not-Internet Explorer conditional comment construct should be left alone': function (src) {
                assert.notEqual(src.indexOf('<!--[if !IE]><!-->Not IE<!--<![endif]-->'), -1);
            },
            'then externalizing the CSS and JavaScript and minifying the HTML': {
                topic: function (_, assetGraph) {
                    assetGraph.queue(
                        transforms.externalizeRelations({type: ['HTMLStyle', 'HTMLScript']}),
                        transforms.minifyAssets({type: 'HTML'})
                    ).run(this.callback);
                },
                'and get the HTML as text again': {
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
