var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph');

vows.describe('data: url').addBatch({
    'After loading Html with data: url anchors': {
        topic: function () {
            new AssetGraph({root: __dirname + '/dataUrl/'})
                .loadAssets('dataUrl.html')
                .populate()
                .run(this.callback)
        },
        'the graph should contain 8 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 8);
        },
        'the first data: url Html should contain a smiley character': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html'})[1].parseTree.body.firstChild.nodeValue,
                         "\u263a");
        },
        'the second data: url Html should contain some Danish characters': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html'})[2].parseTree.body.firstChild.nodeValue,
                         "æøå");
        },
        'the third data: url Html should contain something that looks like Html': function (assetGraph) {
            assert.matches(assetGraph.findAssets({type: 'Html'})[3].text,
                           /^<!DOCTYPE html>/);
        },
        'the first data: url Text should be decoded correctly': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Text'})[0].text,
                         "ΩδΦ");
        },
        'the second data: url Text should be decoded correctly': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Text'})[1].text,
                         "Hellö");
        },
        'the third data: url Text should be decoded correctly': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Text'})[2].text,
                         "A brief note");
        },
        'the fourth data: url Text should be decoded correctly': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Text'})[3].text,
                         "ΩδΦ");
        }
    }
})['export'](module);
