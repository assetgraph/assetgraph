/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/HtmlEdgeSideIncludeSafeComment', function () {
    it('should handle a test case with existing <!--esi ...---> comments', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlEdgeSideIncludeSafeComment/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 3);
                expect(assetGraph, 'to contain asset', {type: 'Html', isInline: true});
                expect(assetGraph, 'to contain asset', {type: 'Html', isInline: false});
                expect(assetGraph, 'to contain asset', 'Png');
                expect(assetGraph, 'to contain relation', 'HtmlEdgeSideIncludeSafeComment');

                assetGraph.findAssets({type: 'Html', isInline: false})[0].minify();

                // the <!--esi ...--> should still be there
                expect(assetGraph.findAssets({type: 'Html', isInline: false})[0].text, 'to match', /<!--esi.*-->/);
            })
            .run(done);
    });
});
