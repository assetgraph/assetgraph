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
        'the graph should contain 9 assets': function (assetGraph) {
            assert.equal(assetGraph.assets.length, 9);
        },
        'then moving the script asset to a different url and serializing the HTML': {
            topic: function (assetGraph) {
                assetGraph.setAssetUrl(assetGraph.findAssets({type: 'JavaScript'})[0], assetGraph.resolver.root + 'fixIE6ForTheLoveOfGod.js');
                assetGraph.serializeAsset(assetGraph.findAssets({url: /index\.html$/})[0], this.callback);
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
                    assetGraph.transform(
                        transforms.externalizeAssets({type: ['CSS', 'JavaScript']}),
                        transforms.minifyAssets({url: /index\.html$/}),
                        this.callback
                    );
                },
                'and serialize the HTML again': {
                    topic: function (assetGraph) {
                        assetGraph.serializeAsset(assetGraph.findAssets({url: /index\.html$/})[0], this.callback);
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
