var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib');

vows.describe('data: url').addBatch({
    'After loading Html with data: url anchors': {
        topic: function () {
            new AssetGraph({root: __dirname + '/dataUrl/'})
                .loadAssets('dataUrl.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 8 assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 8);
        },
        'the first data: url Html should contain a smiley character': function (assetGraph) {
            expect(assetGraph.findAssets({type: 'Html'})[1].parseTree.body.firstChild.nodeValue, 'to equal', '\u263a');
        },
        'the second data: url Html should contain some Danish characters': function (assetGraph) {
            expect(assetGraph.findAssets({type: 'Html'})[2].parseTree.body.firstChild.nodeValue, 'to equal', 'æøå');
        },
        'the third data: url Html should contain something that looks like Html': function (assetGraph) {
            expect(assetGraph.findAssets({type: 'Html'})[3].text, 'to match', /^<!DOCTYPE html>/);
        },
        'the first data: url Text should be decoded correctly': function (assetGraph) {
            expect(assetGraph.findAssets({type: 'Text'})[0].text, 'to equal', 'ΩδΦ');
        },
        'the second data: url Text should be decoded correctly': function (assetGraph) {
            expect(assetGraph.findAssets({type: 'Text'})[1].text, 'to equal', 'Hellö');
        },
        'the third data: url Text should be decoded correctly': function (assetGraph) {
            expect(assetGraph.findAssets({type: 'Text'})[2].text, 'to equal', 'A brief note');
        },
        'the fourth data: url Text should be decoded correctly': function (assetGraph) {
            expect(assetGraph.findAssets({type: 'Text'})[3].text, 'to equal', 'ΩδΦ');
        }
    },
    'After loading Html with an unparsable data: url': {
        topic: function () {
            new AssetGraph({root: __dirname + '/dataUrl/'})
                .loadAssets('unparsableDataUrl.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain no relations': function (assetGraph) {
            expect(assetGraph, 'to contain no relations');
        }
    }
})['export'](module);
