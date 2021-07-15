const pathModule = require('path');
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('relations/HtmlLogo', function () {
  it('should handle a test case with an existing <link rel="logo" href="..."> element', async function () {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(__dirname, '../../testdata/relations/HtmlLogo/'),
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    expect(assetGraph, 'to contain relation', 'HtmlLogo');
    expect(assetGraph, 'to contain asset', 'Svg');
    assetGraph.findAssets({ type: 'Svg' })[0].url =
      'http://example.com/otherLogo.png';
    expect(
      assetGraph.findAssets({ type: 'Html' })[0].text,
      'to match',
      /otherLogo\.png/
    );
  });
});
