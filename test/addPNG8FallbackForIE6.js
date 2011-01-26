var vows = require('vows'),
    assert = require('assert'),
    step = require('step'),
    SiteGraph = require('../SiteGraph'),
    transforms = require('../transforms');

vows.describe('Add PNG8 fallback for IE6').addBatch({
    'After loading a the test case': {
        topic: function () {
            new SiteGraph({root: __dirname + '/addPNG8FallbackForIE6'}).applyTransform(
                transforms.addInitialAssets('style.css'),
                transforms.populate(),
                transforms.escapeToCallback(this.callback)
            );
        },
        'the graph contains the expected assets and relations': function (siteGraph) {
            assert.equal(siteGraph.assets.length, 3);
            assert.equal(siteGraph.findAssets('type', 'PNG').length, 2);
            assert.equal(siteGraph.findAssets('type', 'CSS').length, 1);
            assert.equal(siteGraph.findRelations('type', 'CSSBackgroundImage').length, 2);
        },
        'then running the addPNG8FallbackForIE6 transform': {
            topic: function (siteGraph) {
                siteGraph.applyTransform(
                    transforms.addPNG8FallbackForIE6(),
                    transforms.escapeToCallback(this.callback)
                );
            },
            'the number of PNG assets should be 3': function (siteGraph) {
                assert.equal(siteGraph.findAssets('type', 'PNG').length, 3);
            },
            'the first two CSSBackgroundImage relations should be in the same cssRule': function (siteGraph) {
                var cssBackgroundImages = siteGraph.findRelations('type', 'CSSBackgroundImage');
                assert.equal(cssBackgroundImages[0].cssRule, cssBackgroundImages[1].cssRule);
            },
            'then fetching the source of the two images': {
                topic: function (siteGraph) {
                    var cssBackgroundImages = siteGraph.findRelations('type', 'CSSBackgroundImage');
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
