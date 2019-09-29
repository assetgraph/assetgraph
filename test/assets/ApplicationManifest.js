const pathModule = require('path');
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('assets/ApplicationManifest', function() {
  it('should detect .webmanifest extensions', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/assets/ApplicationManifest/'
      )
    });
    await assetGraph.loadAssets('basic.webmanifest');

    expect(assetGraph, 'to contain assets', 'ApplicationManifest', 1);
  });

  it('should detect related_applications urls', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/assets/ApplicationManifest/'
      )
    });
    await assetGraph.loadAssets('related_applications.webmanifest');

    expect(assetGraph, 'to contain relations', 'ApplicationManifestUrl', 2);
  });

  it('should detect splash_screens urls', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/assets/ApplicationManifest/'
      )
    });
    await assetGraph.loadAssets('splash_screens.webmanifest');

    expect(assetGraph, 'to contain relations', 'ApplicationManifestUrl', 2);

    await assetGraph.populate();

    expect(assetGraph, 'to contain relations', 'ApplicationManifestUrl', 2);
    expect(assetGraph, 'to contain assets', 'Png', 1);
    expect(assetGraph, 'to contain assets', 'Jpeg', 1);
  });

  it('should detect icons urls', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/assets/ApplicationManifest/'
      )
    });
    await assetGraph.loadAssets('icons.webmanifest');

    expect(assetGraph, 'to contain relations', 'ApplicationManifestUrl', 2);

    await assetGraph.populate();

    expect(assetGraph, 'to contain relations', 'ApplicationManifestUrl', 2);
    expect(assetGraph, 'to contain asset', 'Png');
    expect(assetGraph, 'to contain asset', 'Jpeg');
  });

  it('should detect start_url urls', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/assets/ApplicationManifest/'
      )
    });
    await assetGraph.loadAssets('start_url.webmanifest');

    expect(assetGraph, 'to contain relation', 'ApplicationManifestUrl');
    expect(assetGraph, 'to contain asset', 'Html');
  });
});
