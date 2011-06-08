var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = AssetGraph.transforms;

vows.describe('data: url').addBatch({
    'After loading Html with data: url anchors': {
        topic: function () {
            new AssetGraph({root: __dirname + '/dataUrl/'}).queue(
                transforms.loadAssets('dataUrl.html'),
                transforms.populate()
            ).run(this.callback);
        },
        'the graph should contain 3 Html assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html'}).length, 3);
        },
        'the body of the first data: url Html should contain a smiley character': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html'})[1].parseTree.body.firstChild.nodeValue,
                         "\u263a");
        },
        'the body of the second data: url Html should contain some Danish characters': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html'})[2].parseTree.body.firstChild.nodeValue,
                         "æøå");
        }
    }
})['export'](module);
