/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('relations/HtmlApplet', function () {
    it('should handle a simple test case', async function () {
        const assetGraph = new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlApplet/'});
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();

        expect(assetGraph, 'to contain assets', 2);
        expect(assetGraph, 'to contain asset', 'Html');
        expect(assetGraph, 'to contain relation', 'HtmlApplet');
        expect(assetGraph, 'to contain asset', { type: undefined });
    });
});
