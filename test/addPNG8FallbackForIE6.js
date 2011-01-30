var vows = require('vows'),
    assert = require('assert'),
    step = require('step'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = require('../lib/transforms');

vows.describe('Add PNG8 fallback for IE6').addBatch({
    'After loading a the test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/addPNG8FallbackForIE6'}).transform(
                transforms.addAssets('style.css'),
                transforms.populate(),
                transforms.escapeToCallback(this.callback)
            );
        },
        'the graph contains the expected assets and relations': function (assetGraph) {
            assert.equal(assetGraph.assets.length, 3);
            assert.equal(assetGraph.findAssets('type', 'PNG').length, 2);
            assert.equal(assetGraph.findAssets('type', 'CSS').length, 1);
            assert.equal(assetGraph.findRelations('type', 'CSSBackgroundImage').length, 2);
        },
        'then running the addPNG8FallbackForIE6 transform': {
            topic: function (assetGraph) {
                assetGraph.transform(
                    transforms.addPNG8FallbackForIE6(),
                    transforms.escapeToCallback(this.callback)
                );
            },
            'the number of PNG assets should be 3': function (assetGraph) {
                assert.equal(assetGraph.findAssets('type', 'PNG').length, 3);
            },
            'the first two CSSBackgroundImage relations should be in the same cssRule': function (assetGraph) {
                var cssBackgroundImages = assetGraph.findRelations('type', 'CSSBackgroundImage');
                assert.equal(cssBackgroundImages[0].cssRule, cssBackgroundImages[1].cssRule);
            },
            'then fetching the source of the two images': {
                topic: function (assetGraph) {
                    var cssBackgroundImages = assetGraph.findRelations('type', 'CSSBackgroundImage');
                    step(
                        function () {
                            cssBackgroundImages[0].to.getOriginalSrc(this.parallel());
                            cssBackgroundImages[1].to.getOriginalSrc(this.parallel());
                        },
                        this.callback
                    );
                },
                'should return something that looks like PNGs': function (err, firstSrc, secondSrc) {
                    assert.isTrue(/^\u0089PNG/.test(firstSrc));
                    assert.isTrue(/^\u0089PNG/.test(secondSrc));
                },
                'the second one should be smaller than the first': function (err, firstSrc, secondSrc) {
                    assert.lesser(secondSrc.length, firstSrc.length);
                }
            }
        }
    }
})['export'](module);
