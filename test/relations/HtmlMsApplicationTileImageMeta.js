const pathModule = require('path');
/* global describe, it */
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('relations/HtmlMsApplicationTileImageMeta', function() {
  it('should handle a test case with an existing <meta name="msapplication-TileImage" content="..."> element', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/relations/HtmlMsApplicationTileImageMeta/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    expect(assetGraph, 'to contain relation', 'HtmlMsApplicationTileImageMeta');
    expect(assetGraph, 'to contain asset', 'Png');
  });
});
