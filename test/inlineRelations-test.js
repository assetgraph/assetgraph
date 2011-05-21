var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = require('../lib/transforms'),
    query = require('../lib/query');

vows.describe('Inlining relations').addBatch({
    'After loading a test case with an HTML asset that has an external CSS asset in a conditional comment': {
        topic: function () {
            new AssetGraph({root: __dirname + '/inlineRelations/'}).queue(
                transforms.loadAssets('index.html'),
                transforms.populate()
            ).run(this.callback);
        },
        'the graph should contain 4 assets': function (assetGraph) {
            assert.equal(assetGraph.assets.length, 4);
        },
        'the graph should contain 2 HTML assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'HTML'}).length, 2);
        },
        'the graph should contain one CSS asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'CSS'}).length, 1);
        },
        'the graph should contain one PNG asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'PNG'}).length, 1);
        },
        'then inlining the CSS and getting the HTML as text': {
            topic: function (assetGraph) {
                var callback = this.callback;
                assetGraph.inlineRelation(assetGraph.findRelations({type: 'HTMLStyle'})[0], function (err) {
                    if (err) {
                        return callback(err);
                    }
                    assetGraph.getAssetText(assetGraph.findAssets({type: 'HTML', url: query.defined})[0], callback);
                });
            },
            'the CSSImage url should be relative to the HTML asset': function (src) {
                var matches = src.match(/url\(some\/directory\/foo\.png\)/g);
                assert.equal(matches.length, 2);
            }
        }
    }
})['export'](module);
