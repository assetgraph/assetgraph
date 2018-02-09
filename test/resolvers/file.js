const pathModule = require('path');
/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('resolvers/file', function () {
    it('should handle a test case with non-ASCII file names', async function () {
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/resolvers/file/')});
        await assetGraph.loadAssets('spaces, unsafe chars & ñøń-ÃßÇ¡¡.html');
        await assetGraph.populate();

        expect(assetGraph, 'to contain asset');
    });
});
