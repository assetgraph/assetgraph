const pathModule = require('path');
const expect = require('../../unexpected-with-plugins');
const AssetGraph = require('../../../lib/AssetGraph');

describe('relations/ApplicationManifestUrl', function() {
  it('should get the href correctly', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../../testdata/relations/ApplicationManifest/ApplicationManifestUrl/'
      )
    });
    await assetGraph.loadAssets('app.webmanifest');
    await assetGraph.populate();

    expect(assetGraph, 'to contain relations', 'HtmlApplicationManifest', 1);
    expect(assetGraph, 'to contain relations', 'ApplicationManifestUrl', 1);

    expect(
      assetGraph.findRelations({ type: 'ApplicationManifestUrl' }),
      'to satisfy',
      [
        {
          href: 'index.html',
          hrefType: 'relative'
        }
      ]
    );
  });

  it('should set the href correctly', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../../testdata/relations/ApplicationManifest/ApplicationManifestUrl/'
      )
    });
    await assetGraph.loadAssets('app.webmanifest');
    await assetGraph.populate();

    assetGraph.findAssets({ type: 'Html' })[0].fileName = 'foo.html';

    expect(
      assetGraph.findRelations({ type: 'ApplicationManifestUrl' }),
      'to satisfy',
      [
        {
          href: 'foo.html',
          hrefType: 'relative'
        }
      ]
    );
  });
});
