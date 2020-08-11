const pathModule = require('path');
const expect = require('../../unexpected-with-plugins');
const AssetGraph = require('../../../lib/AssetGraph');

describe('relations/JavaScriptStaticUrl', function () {
  it('should handle root relative urls', async function () {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../../testdata/relations/JavaScript/JavaScriptStaticUrl/rootRelative/'
      ),
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    expect(
      assetGraph.findRelations({ type: 'JavaScriptStaticUrl' }),
      'to satisfy',
      [{ href: '/images/foo.png' }]
    );
  });
});
