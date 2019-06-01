const pathModule = require('path');
/* global describe, it */
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

const testRoot = pathModule.resolve(
  __dirname,
  '../../testdata/relations/JavaScriptFetch'
);

describe('relations/JavaScriptPaintWorklet', function() {
  it('should detect a relative path', async function() {
    const assetGraph = new AssetGraph({
      root: testRoot
    });
    await assetGraph.addAsset({
      type: 'JavaScript',
      text: `CSS.paintWorklet.addModule('./relativeurl.js');`
    });

    expect(assetGraph, 'to contain assets', 'JavaScript', 2);
    expect(assetGraph, 'to contain relations', 'JavaScriptPaintWorklet', 1);
  });
});
