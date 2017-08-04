/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('relations/HtmlShortcutIcon', function () {
    it('should handle a test case with an existing <link rel="shortcut icon" href="..."> elements in different variants', async function () {
        const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlShortcutIcon/'})
            .loadAssets('index.html')
            .populate();

        expect(assetGraph, 'to contain assets', 2);
        expect(assetGraph, 'to contain relations', 'HtmlShortcutIcon', 7);

        const htmlAsset = assetGraph.findAssets({type: 'Html'})[0];
        const pngAsset = assetGraph.findAssets({type: 'Png'})[0];
        const firstExistingHtmlShortcutIconRelation = assetGraph.findRelations({type: 'HtmlShortcutIcon'})[0];

        new AssetGraph.HtmlShortcutIcon({
            from: htmlAsset,
            to: pngAsset
        }).attach(htmlAsset, 'after', firstExistingHtmlShortcutIconRelation);
        new AssetGraph.HtmlShortcutIcon({
            from: htmlAsset,
            to: pngAsset
        }).attach(htmlAsset, 'before', firstExistingHtmlShortcutIconRelation);

        expect(assetGraph, 'to contain relations', 'HtmlShortcutIcon', 9);

        const matches = assetGraph.findAssets({type: 'Html'})[0].text.match(/<link rel="shortcut icon" href="foo.png">/g);
        expect(matches, 'not to be null')
            .and('to have length', 3);
    });
});
