/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    urlTools = require('urltools'),
    AssetGraph = require('../../lib'),
    query = AssetGraph.query;

describe('relations/HtmlEdgeSideInclude', function () {
    it('should handle a test case with existing <esi ...> elements', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlEdgeSideInclude/'})
            .loadAssets('index.html')
            .populate({
                followRelations: {to: {url: /\.html$/}}
            })
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Html', 2);
                expect(assetGraph, 'to contain relation', 'HtmlEdgeSideInclude');
                expect(assetGraph, 'to contain relations including unresolved', 'HtmlEdgeSideInclude', 2);
                assetGraph.findAssets({url: /\/index\.html/})[0].url = urlTools.resolveUrl(assetGraph.root, 'foo/index.html');
                expect(
                    assetGraph.findRelations({to: {url: /\.php$/}, type: 'HtmlEdgeSideInclude'}, true)[0].href,
                    'to equal',
                     '../dynamicStuff/getTitleForReferringPage.php'
                );
            })
            .run(done);
    });
});
