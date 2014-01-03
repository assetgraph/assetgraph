var vows = require('vows'),
    assert = require('assert'),
    urlTools = require('url-tools'),
    AssetGraph = require('../lib/AssetGraph');

vows.describe('Parsing conditional comments in Html').addBatch({
    'After loading a test case with conditional comments': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlConditionalComment/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 9 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 9);
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
                        .run(this.callback);
                },
                'and get the Html as text again': {
                    topic: function (assetGraph) {
                        return assetGraph.findAssets({url: /\/index\.html$/})[0].text;
                    },
                    'the conditional comments should still be there': function (text) {
                        assert.matches(text, /Good old/);
                        assert.matches(text, /<script src="fixIE6ForTheLoveOfGod\.js"><\/script>/);
                        assert.matches(text, /<!--\[if !IE\]>\s*-->Not IE<!--\s*<!\[endif\]-->/);
                        assert.matches(text, /<!--\[if IE\]>\s*<link rel="stylesheet" href="[^\"]+\.css" \/>\s*<!\[endif\]-->/);
                    }
                }
            }
        }
    },
    'After loading a test case with the HTML5 boilerplate conditional comments': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlConditionalComment/'})
                .loadAssets('html5Boilerplate.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 3 HtmlConditionalComment relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlConditionalComment'}).length, 3);
        },
        'the graph should contain 3 inline Html assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html', isInline: true}).length, 3);
        },
        'then mark all the inline Html assets dirty': {
            topic: function (assetGraph) {
                assetGraph.findAssets({type: 'Html', isInline: true}).forEach(function (htmlAsset) {
                    htmlAsset.markDirty();
                });
                return assetGraph;
            },
            'the main Html document should still have unbalanced tags in the conditional comments': function (assetGraph) {
                var text = assetGraph.findAssets({type: 'Html', isInline: false})[0].text;
                assert.matches(text, /<!--\[if lt IE 7\]>\s*<html class="no-js lt-ie9 lt-ie8 lt-ie7">\s*<!\[endif\]-->/);
                assert.matches(text, /<!--\[if IE 7\]>\s*<html class="no-js lt-ie9 lt-ie8">\s*<!\[endif\]-->/);
                assert.matches(text, /<!--\[if IE 8\]>\s*<html class="no-js lt-ie9">\s*<!\[endif\]-->/);
                assert.matches(text, /<!--\[if gt IE 8\]><!-->\s*<html class="no-js">\s*<!--<!\[endif\]-->/);
            }
        }
    }
})['export'](module);
