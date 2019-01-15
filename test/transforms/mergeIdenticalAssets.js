const pathModule = require('path');
/* global describe, it */
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('transforms/mergeIdenticalAssets', function() {
  it('should handle a combo test case', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/mergeIdenticalAssets/combo/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    expect(assetGraph, 'to contain assets', 4);
    expect(assetGraph, 'to contain asset', 'Html');
    expect(assetGraph, 'to contain assets', 'Png', 2);
    expect(assetGraph, 'to contain relations', 'HtmlImage', 2);
    expect(
      assetGraph,
      'to contain relations',
      { from: { type: 'CacheManifest' } },
      2
    );

    await assetGraph.mergeIdenticalAssets();

    expect(assetGraph, 'to contain asset', 'Png');
    expect(assetGraph, 'to contain relation', {
      from: { type: 'CacheManifest' }
    });

    const htmlImages = assetGraph.findRelations({ type: 'HtmlImage' });
    expect(htmlImages, 'to have length', 2);
    expect(htmlImages[0].to, 'to equal', htmlImages[1].to);
  });

  it('should handle a test case with a JavaScript asset and a Css asset with identical contents', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/mergeIdenticalAssets/identicalAssetsOfDifferentTypes/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    expect(assetGraph, 'to contain assets', 'JavaScript', 2);
    expect(assetGraph, 'to contain assets', 'Css', 2);

    await assetGraph.mergeIdenticalAssets();

    expect(assetGraph, 'to contain asset', 'JavaScript');
    expect(assetGraph, 'to contain asset', 'Css');
  });
});
