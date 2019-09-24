const expect = require('../../unexpected-with-plugins');
const AssetGraph = require('../../../');
const pathModule = require('path');

describe('FileRedirect relation', function() {
  it('should expand dir without trailing slash', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '..',
        '..',
        '..',
        'testdata',
        'relations',
        'Asset',
        'FileRedirect',
        'noTrailingSlash'
      )
    });
    await assetGraph.loadAssets('index.html').populate();

    expect(assetGraph, 'to contain relation', 'FileRedirect');
    expect(assetGraph, 'to contain asset', { type: undefined });
    expect(
      assetGraph.findRelations({ type: 'FileRedirect' })[0],
      'to satisfy',
      {
        from: { url: `${assetGraph.root}subdir` },
        to: { url: `${assetGraph.root}subdir/index.html` }
      }
    );
  });

  it('should expand dir with trailing slash', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '..',
        '..',
        '..',
        'testdata',
        'relations',
        'Asset',
        'FileRedirect',
        'trailingSlash'
      )
    });
    await assetGraph.loadAssets('index.html').populate();

    expect(assetGraph, 'to contain relation', 'FileRedirect');
    expect(assetGraph, 'to contain asset', { type: undefined });
    expect(
      assetGraph.findRelations({ type: 'FileRedirect' })[0],
      'to satisfy',
      {
        from: { url: `${assetGraph.root}subdir/` },
        to: { url: `${assetGraph.root}subdir/index.html` }
      }
    );
  });
});
