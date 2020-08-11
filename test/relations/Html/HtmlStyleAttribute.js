const pathModule = require('path');
const expect = require('../../unexpected-with-plugins');
const AssetGraph = require('../../../lib/AssetGraph');

describe('relations/HtmlStyleAttribute', function () {
  it('should handle a test case with existing <link rel="stylesheet"> and <style> elements', async function () {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../../testdata/relations/Html/HtmlStyleAttribute/'
      ),
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    expect(assetGraph, 'to contain assets', 4);
    expect(assetGraph, 'to contain asset', 'Html');
    expect(assetGraph, 'to contain relations', 'HtmlStyleAttribute', 2);
    expect(assetGraph, 'to contain relation', 'CssImage');
    expect(assetGraph, 'to contain asset', 'Png');

    await assetGraph.inlineRelations({ type: 'CssImage' });

    expect(
      assetGraph.findAssets({ type: 'Html' })[0].text,
      'to match',
      /data:/
    );

    let cssAsset = assetGraph.findAssets({ type: 'Css' })[0];
    cssAsset.parseTree.nodes[0].append('line-height: 200%');
    cssAsset.markDirty();
    expect(
      assetGraph.findAssets({ type: 'Html' })[0].text,
      'to match',
      /line-height:/
    );

    cssAsset = assetGraph.findAssets({ type: 'Css' })[1];
    cssAsset.parseTree.nodes[0].append('line-height: 200%');
    cssAsset.markDirty();
    expect(
      assetGraph.findAssets({ type: 'Html' })[0].text,
      'to match',
      /foo:\s*bar;.*foo:\s*quux/
    );
  });
});
