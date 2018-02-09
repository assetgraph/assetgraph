const pathModule = require('path');
/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('relations/HtmlImport', function () {
    it('should handle a test case with an existing <link rel="import"> element', async function () {
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/relations/HtmlImport/')});
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();

        expect(assetGraph, 'to contain relations', 'HtmlImport', 3);
        expect(assetGraph, 'to contain assets', {
            type: 'Html',
            isPopulated: true
        }, 4);
        expect(assetGraph, 'to contain assets', {
            type: 'Css',
            isPopulated: true
        }, 1);
    });
});
