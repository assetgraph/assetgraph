var URL = require('url'),
    vows = require('vows'),
    assert = require('assert'),
    step = require('step'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = require('../lib/transforms'),
    query = require('../lib/query');

vows.describe('data: url').addBatch({
    'After loading HTML with data: url anchors': {
        topic: function () {
            new AssetGraph({root: __dirname + '/dataUrl/'}).transform(
                transforms.loadAssets('dataUrl.html'),
                transforms.populate(),
                this.callback
            );
        },
        'the graph should contain 3 HTML assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'HTML'}).length, 3);
        },
        'the body of the first data: url HTML should contain a smiley character': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'HTML'})[1].parseTree.body.firstChild.nodeValue,
                         "\u263a");
        },
        'the body of the second data: url HTML should contain some Danish characters': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'HTML'})[2].parseTree.body.firstChild.nodeValue,
                         "æøå");
        }
    }
})['export'](module);
