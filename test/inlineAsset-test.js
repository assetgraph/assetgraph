var vows = require('vows'),
    assert = require('assert'),
    step = require('step'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = require('../lib/transforms'),
    query = require('../lib/query');

vows.describe('Inlining an asset').addBatch({
    'After loading a test case with an HTML asset that has an external CSS asset in a conditional comment': {
        topic: function () {
            new AssetGraph({root: __dirname + '/inlineAsset/'}).transform(
                transforms.loadAssets('index.html'),
                transforms.populate(),
                this.callback
            );
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
        'then inlining the CSS and serializing the HTML': {
            topic: function (assetGraph) {
                var callback = this.callback;
                assetGraph.inlineAsset(assetGraph.findAssets({type: 'CSS'})[0], function (err) {
                    if (err) {
                        return callback(err);
                    }
                    assetGraph.serializeAsset(assetGraph.findAssets({type: 'HTML', url: query.defined})[0], callback);
                });
            },
            'the CSSBackgroundImage url should be relative to the HTML asset': function (src) {
                assert.notEqual(src.indexOf("url(some/directory/foo.png)"), -1);
            }
        }
    }
})['export'](module);
