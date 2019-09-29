const pathModule = require('path');
const expect = require('../../unexpected-with-plugins');
const AssetGraph = require('../../../lib/AssetGraph');

describe('relations/HtmlAppleTouchStartupImage', function() {
  it('should handle a simple test case', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../../testdata/relations/Html/HtmlAppleTouchStartupImage/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    expect(assetGraph, 'to contain assets', 2);
    expect(assetGraph, 'to contain relation', 'HtmlAppleTouchStartupImage');
    const htmlAsset = assetGraph.findAssets({ type: 'Html' })[0];
    const pngAsset = assetGraph.findAssets({ type: 'Png' })[0];
    const existingHtmlAppleTouchStartupImageRelation = assetGraph.findRelations(
      {
        type: 'HtmlAppleTouchStartupImage'
      }
    )[0];
    htmlAsset.addRelation(
      {
        type: 'HtmlAppleTouchStartupImage',
        to: pngAsset
      },
      'after',
      existingHtmlAppleTouchStartupImageRelation
    );
    htmlAsset.addRelation(
      {
        type: 'HtmlAppleTouchStartupImage',
        to: pngAsset
      },
      'before',
      existingHtmlAppleTouchStartupImageRelation
    );

    expect(assetGraph, 'to contain relations', 'HtmlAppleTouchStartupImage', 3);

    const matches = assetGraph
      .findAssets({ type: 'Html' })[0]
      .text.match(/<link rel="apple-touch-startup-image" href="foo.png">/g);
    expect(matches, 'not to be null');
    expect(matches, 'to have length', 3);
  });
});
