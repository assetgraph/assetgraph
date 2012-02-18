var vows = require('vows'),
    assert = require('assert'),
    urlTools = require('../lib/util/urlTools'),
    AssetGraph = require('../lib/AssetGraph');

vows.describe('Parsing conditional comments in Html').addBatch({
    'After loading a test case with conditional comments': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlConditionalComment/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback)
        },
        'the graph should contain 10 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 10);
        },
        'then moving the script asset to a different url and getting the Html as text': {
            topic: function (assetGraph) {
               assetGraph.findAssets({type: 'JavaScript'})[0].url = urlTools.resolveUrl(assetGraph.root, 'fixIE6ForTheLoveOfGod.js');
               return assetGraph.findAssets({url: /index\.html$/})[0].text;
            },
            'the conditional comment should still be there and contain the updated <script>': function (text) {
                assert.matches(text, /Good old/);
                assert.matches(text, /<script src="fixIE6ForTheLoveOfGod\.js"><\/script>/);
            },
            'the not-Internet Explorer conditional comment construct should be intact': function (text) {
                assert.matches(text, /<!--\[if !IE\]>\s*-->Not IE<!--\s*<!\[endif\]-->/);
            },
            'then externalizing the Css and JavaScript and minifying the Html': {
                topic: function (_, assetGraph) {
                    assetGraph
                        .externalizeRelations({type: ['HtmlStyle', 'HtmlScript']})
                        .minifyAssets({type: 'Html'})
                        .run(this.callback)
                },
                'and get the Html as text again': {
                    topic: function (assetGraph) {
                        return assetGraph.findAssets({url: /index\.html$/})[0].text;
                    },
                    'the conditional comments should still be there': function (text) {
                        assert.matches(text, /Good old/);
                        assert.matches(text, /<script src="fixIE6ForTheLoveOfGod\.js"><\/script>/);
                        assert.matches(text, /<!--\[if !IE\]>\s*-->Not IE<!--\s*<!\[endif\]-->/);
                        assert.matches(text, /<!--\[if IE\]><link rel="stylesheet" href="[^\"]+\.css"><!\[endif\]-->/);
                    }
                }
            }
        }
    }
})['export'](module);
