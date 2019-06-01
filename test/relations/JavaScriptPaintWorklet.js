const pathModule = require('path');
/* global describe, it */
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

const testRoot = pathModule.resolve(
  __dirname,
  '../../testdata/relations/JavaScriptPaintWorklet'
);

describe('relations/JavaScriptPaintWorklet', function() {
  it('should detect a relative path', async function() {
    const assetGraph = new AssetGraph({
      root: testRoot
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    expect(assetGraph, 'to contain assets', 'JavaScript', 2);
    expect(assetGraph, 'to contain relation', 'JavaScriptPaintWorklet');
  });

  it('should read the href correctly', async function() {
    const assetGraph = new AssetGraph({
      root: testRoot
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    const relation = assetGraph.findRelations({ type: 'JavaScriptPaintWorklet' })[0];

    expect(relation, 'to satisfy', {
      href: '/js/paintworklet.js',
      to: {
        path: '/js/',
        fileName: 'paintworklet.js'
      }
    });
  });

  // TODO: Test that assetgraph population emits WARN when hitting a relative URL in the href
  // Relative URLs are resolved from the current pages path, not the including javascript parents path
});
