/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/HtmlAppleTouchStartupImage', function () {
    it('should handle a simple test case', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlAppleTouchStartupImage/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 2);
                expect(assetGraph, 'to contain relation', 'HtmlAppleTouchStartupImage');
                var htmlAsset = assetGraph.findAssets({type: 'Html'})[0],
                    pngAsset = assetGraph.findAssets({type: 'Png'})[0],
                    existingHtmlAppleTouchStartupImageRelation = assetGraph.findRelations({type: 'HtmlAppleTouchStartupImage'})[0];
                new AssetGraph.HtmlAppleTouchStartupImage({
                    from: htmlAsset,
                    to: pngAsset
                }).attach(htmlAsset, 'after', existingHtmlAppleTouchStartupImageRelation);
                new AssetGraph.HtmlAppleTouchStartupImage({
                    from: htmlAsset,
                    to: pngAsset
                }).attach(htmlAsset, 'before', existingHtmlAppleTouchStartupImageRelation);


                expect(assetGraph, 'to contain relations', 'HtmlAppleTouchStartupImage', 3);

                var matches = assetGraph.findAssets({type: 'Html'})[0].text.match(/<link rel="apple-touch-startup-image" href="foo.png">/g);
                expect(matches, 'not to be null');
                expect(matches, 'to have length', 3);
            })
            .run(done);
    });
});
