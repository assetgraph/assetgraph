const pathModule = require('path');
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('resolvers/file', function() {
  it('should handle a test case with non-ASCII file names', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(__dirname, '../../testdata/resolvers/file/')
    });
    await assetGraph.loadAssets('spaces, unsafe chars & ñøń-ÃßÇ¡¡.html');
    await assetGraph.populate();

    expect(assetGraph, 'to contain asset', {
      type: 'Html',
      url: `${assetGraph.root}spaces,%20unsafe%20chars%20&%20%C3%B1%C3%B8%C5%84-%C3%83%C3%9F%C3%87%C2%A1%C2%A1.html`,

      isLoaded: true
    });
  });
});
