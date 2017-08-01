/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib/AssetGraph');

describe('relations/SystemJsBundle', function () {
    it('should handle a test case with a JavaScript asset that has a #SystemJsBundle directive', async function () {
        const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/relations/SystemJsBundle/'})
            .loadAssets('index.html')
            .populate();

        expect(assetGraph, 'to contain assets', 3);
        expect(assetGraph, 'to contain assets', 'JavaScript', 2);
        expect(assetGraph, 'to contain relation', 'SystemJsBundle');

        for (const asset of assetGraph.findAssets({type: 'JavaScript'})) {
            asset.minify();
        }

        assetGraph.findAssets({fileName: 'foo.js'})[0].url = assetGraph.root + 'bar.js';

        expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to contain', '//# SystemJsBundle=bar.js');

        assetGraph.findRelations({type: 'SystemJsBundle'})[0].detach();

        expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'not to contain', '//');

        new AssetGraph.SystemJsBundle({
            to: assetGraph.findAssets({fileName: 'bar.js'})[0]
        }).attach(assetGraph.findAssets({type: 'JavaScript'})[0], 'last');
    });
});
