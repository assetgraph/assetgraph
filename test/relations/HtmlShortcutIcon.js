/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/HtmlShortcutIcon', function () {
    it('should handle a test case with an existing <link rel="shortcut icon" href="..."> elements in different variants', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlShortcutIcon/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 2);
                expect(assetGraph, 'to contain relations', 'HtmlShortcutIcon', 7);

                var htmlAsset = assetGraph.findAssets({type: 'Html'})[0],
                    pngAsset = assetGraph.findAssets({type: 'Png'})[0],
                    firstExistingHtmlShortcutIconRelation = assetGraph.findRelations({type: 'HtmlShortcutIcon'})[0];
                new AssetGraph.HtmlShortcutIcon({
                    from: htmlAsset,
                    to: pngAsset
                }).attach(htmlAsset, 'after', firstExistingHtmlShortcutIconRelation);
                new AssetGraph.HtmlShortcutIcon({
                    from: htmlAsset,
                    to: pngAsset
                }).attach(htmlAsset, 'before', firstExistingHtmlShortcutIconRelation);

                expect(assetGraph, 'to contain relations', 'HtmlShortcutIcon', 9);

                var matches = assetGraph.findAssets({type: 'Html'})[0].text.match(/<link rel="shortcut icon" href="foo.png">/g);
                expect(matches, 'not to be null');
                expect(matches, 'to have length', 3);
            })
            .run(done);
    });
});
