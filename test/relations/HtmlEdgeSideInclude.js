/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const urlTools = require('urltools');
const AssetGraph = require('../../lib/AssetGraph');

describe('relations/HtmlEdgeSideInclude', function () {
    it('should handle a test case with existing <esi ...> elements', async function () {
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/relations/HtmlEdgeSideInclude/')});
        await assetGraph.loadAssets('index.html')
            .populate({
                followRelations: {to: {type: 'Html'}}
            });

        expect(assetGraph, 'to contain assets', 'Html', 2);
        expect(assetGraph, 'to contain relations', 'HtmlEdgeSideInclude', 2);
        expect(assetGraph, 'to contain relations', 'HtmlEdgeSideInclude', 2);
        assetGraph.findAssets({fileName: 'index.html'})[0].url = urlTools.resolveUrl(assetGraph.root, 'foo/index.html');
        expect(
            assetGraph.findRelations({to: {extension: '.php'}, type: 'HtmlEdgeSideInclude'})[0].href,
            'to equal',
            '../dynamicStuff/metaTags.php'
        );
    });
});
