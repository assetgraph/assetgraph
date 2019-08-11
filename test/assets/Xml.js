const pathModule = require('path');
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('assets/Xml', function() {
  it('should handle a test case with an existing Xml asset', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(__dirname, '../../testdata/assets/Xml/')
    });
    await assetGraph.loadAssets('index.html').populate();

    expect(assetGraph, 'to contain assets', 2);
    expect(assetGraph, 'to contain asset', 'Xml');

    const xml = assetGraph.findAssets({ type: 'Xml' })[0];
    expect(
      xml.parseTree.getElementsByTagName('Description'),
      'to have property',
      'length',
      1
    );

    xml.parseTree
      .getElementsByTagName('Description')[0]
      .setAttribute('yay', 'foobarquux');
    xml.markDirty();
    expect(xml.text, 'to match', /foobarquux/);
  });
});
