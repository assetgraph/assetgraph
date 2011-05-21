var vows = require('vows'),
    assert = require('assert'),
    _ = require('underscore'),
    seq = require('seq'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = require('../lib/transforms');

vows.describe('Postprocess images').addBatch({
    'After loading the test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/postProcessBackgroundImages/'}).queue(
                transforms.loadAssets('style.css'),
                transforms.populate()
            ).run(this.callback);
        },
        'the graph contains the expected assets and relations': function (assetGraph) {
            assert.equal(assetGraph.assets.length, 3);
            assert.equal(assetGraph.findAssets({type: 'PNG'}).length, 2);
            assert.equal(assetGraph.findAssets({type: 'CSS'}).length, 1);
            assert.equal(assetGraph.findRelations({type: 'CSSImage'}).length, 2);
        },
        'then running the postProcessBackgroundImages transform': {
            topic: function (assetGraph) {
                assetGraph.queue(transforms.postProcessBackgroundImages()).run(this.callback);
            },
            'the number of PNG assets should be 3': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'PNG'}).length, 3);
            },
            'the first two CSSImage relations should be in the same cssRule': function (assetGraph) {
                var cssBackgroundImages = assetGraph.findRelations({type: 'CSSImage'});
                assert.equal(cssBackgroundImages[0].cssRule, cssBackgroundImages[1].cssRule);
            },
            'then fetching the source of the two images': {
                topic: function (assetGraph) {
                    var callback = this.callback;
                    seq()
                        .extend(assetGraph.findRelations({type: 'CSSImage'}))
                        .parMap(function (cssImage) {
                            cssImage.to.getRawSrc(this);
                        })
                        .seq(function (firstSrc, secondSrc) {
                            callback(null, firstSrc, secondSrc);
                        })
                        ['catch'](callback);
                },
                'should return something that looks like PNGs': function (err, firstSrc, secondSrc) {
                    assert.deepEqual(_.toArray(firstSrc.slice(0, 4)), [0x89, 0x50, 0x4e, 0x47]);
                    assert.deepEqual(_.toArray(secondSrc.slice(0, 4)), [0x89, 0x50, 0x4e, 0x47]);
                },
                'the second one should be smaller than the first': function (err, firstSrc, secondSrc) {
                    assert.lesser(secondSrc.length, firstSrc.length);
                }
            }
        }
    }
})['export'](module);
