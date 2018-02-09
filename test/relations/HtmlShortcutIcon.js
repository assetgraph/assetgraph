const pathModule = require('path');
/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('relations/HtmlShortcutIcon', function () {
    it('should handle a test case with an existing <link rel="shortcut icon" href="..."> elements in different variants', async function () {
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/relations/HtmlShortcutIcon/')});
        await assetGraph.loadAssets('index.html')
            .populate();

        expect(assetGraph, 'to contain assets', 2);
        expect(assetGraph, 'to contain relations', 'HtmlShortcutIcon', 7);

        const htmlAsset = assetGraph.findAssets({type: 'Html'})[0];
        const pngAsset = assetGraph.findAssets({type: 'Png'})[0];
        const firstExistingHtmlShortcutIconRelation = assetGraph.findRelations({type: 'HtmlShortcutIcon'})[0];

        htmlAsset.addRelation({
            type: 'HtmlShortcutIcon',
            to: pngAsset
        }, 'after', firstExistingHtmlShortcutIconRelation);
        htmlAsset.addRelation({
            type: 'HtmlShortcutIcon',
            to: pngAsset
        }, 'before', firstExistingHtmlShortcutIconRelation);

        expect(assetGraph, 'to contain relations', 'HtmlShortcutIcon', 9);

        const matches = assetGraph.findAssets({type: 'Html'})[0].text.match(/<link rel="shortcut icon" href="foo.png">/g);
        expect(matches, 'not to be null')
            .and('to have length', 3);
    });
});
