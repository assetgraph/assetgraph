const pathModule = require('path');
const expect = require('../../unexpected-with-plugins');
const AssetGraph = require('../../../lib/AssetGraph');

describe('relations/HtmlAlternateLink', function () {
  it('should handle a simple test case', async function () {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../../testdata/relations/Html/HtmlAlternateLink/'
      ),
    });

    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    expect(assetGraph, 'to contain relations', 'HtmlAlternateLink', 4);
    expect(assetGraph, 'to contain assets', 'Rss', 2);
    expect(assetGraph, 'to contain asset', 'Atom');
    expect(assetGraph, 'to contain asset', 'Xml');
  });
});
