/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const urlTools = require('urltools');
const AssetGraph = require('../../lib/AssetGraph');

describe('relations/HtmlEdgeSideInclude', function () {
    it('should handle a test case with existing <esi ...> elements', async function () {
        const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlEdgeSideInclude/'})
            .loadAssets('index.html')
            .populate({
                followRelations: {to: {url: /\.html$/}}
            });

        expect(assetGraph, 'to contain assets', 'Html', 2);
        expect(assetGraph, 'to contain relations', 'HtmlEdgeSideInclude', 2);
        expect(assetGraph, 'to contain relations', 'HtmlEdgeSideInclude', 2);
        assetGraph.findAssets({url: /\/index\.html/})[0].url = urlTools.resolveUrl(assetGraph.root, 'foo/index.html');
        expect(
            assetGraph.findRelations({to: {url: /\.php$/}, type: 'HtmlEdgeSideInclude'})[0].href,
            'to equal',
            '../dynamicStuff/metaTags.php'
        );
    });
});
