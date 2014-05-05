var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('resolvers/data', function () {
    it('should handle a test case with data: url anchors', function (done) {
        new AssetGraph({root: __dirname + '/data/'})
            .loadAssets('dataUrl.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 8);
                expect(assetGraph.findAssets({type: 'Html'})[1].parseTree.body.firstChild.nodeValue, 'to equal', '\u263a');
                expect(assetGraph.findAssets({type: 'Html'})[2].parseTree.body.firstChild.nodeValue, 'to equal', 'æøå');
                expect(assetGraph.findAssets({type: 'Html'})[3].text, 'to match', /^<!DOCTYPE html>/);
                expect(assetGraph.findAssets({type: 'Text'})[0].text, 'to equal', 'ΩδΦ');
                expect(assetGraph.findAssets({type: 'Text'})[1].text, 'to equal', 'Hellö');
                expect(assetGraph.findAssets({type: 'Text'})[2].text, 'to equal', 'A brief note');
                expect(assetGraph.findAssets({type: 'Text'})[3].text, 'to equal', 'ΩδΦ');
            })
            .run(done);
    });

    it('should handle a test case with an unparsable data: url', function (done) {
        new AssetGraph({root: __dirname + '/dataUrl/'})
            .loadAssets('unparsableDataUrl.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain no relations');
            })
            .run(done);
    });
});
