const pathModule = require('path');
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('gzip', function() {
  it('should gzip an asset > 860 bytes', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '..',
        '..',
        'testdata',
        'transforms',
        'gzip'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    await assetGraph.gzip();
    expect(assetGraph, 'to contain asset', { extension: '.gz' });
    expect(assetGraph, 'to contain asset', { fileName: 'styles.css.gz' });
  });
});
