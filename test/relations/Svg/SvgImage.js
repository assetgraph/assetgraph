const pathModule = require('path');
const expect = require('../../unexpected-with-plugins');
const AssetGraph = require('../../../lib/AssetGraph');

describe('relations/SvgImage', function() {
  it('should handle a test case with <image xlink:href=...> referencing an external file', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../../testdata/relations/Svg/SvgImage/xlinkhref'
      )
    });
    await assetGraph.loadAssets('image.svg');
    await assetGraph.populate();

    expect(assetGraph, 'to contain relation', 'SvgImage');
    expect(assetGraph, 'to contain asset', 'Svg');
    expect(assetGraph, 'to contain asset', 'Png');
    assetGraph.findAssets({ fileName: 'foo.png' })[0].fileName = 'bar.png';
    expect(
      assetGraph.findAssets({ fileName: 'image.svg' })[0].text,
      'to contain',
      '<image xlink:href="bar.png"/>'
    );
  });

  it('should handle a test case with <image href=...> referencing an external file', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../../testdata/relations/Svg/SvgImage/href/'
      )
    });
    await assetGraph.loadAssets('image.svg');
    await assetGraph.populate();

    expect(assetGraph, 'to contain relation', 'SvgImage');
    expect(assetGraph, 'to contain asset', 'Svg');
    expect(assetGraph, 'to contain asset', 'Png');
    assetGraph.findAssets({ fileName: 'foo.png' })[0].fileName = 'bar.png';
    expect(
      assetGraph.findAssets({ fileName: 'image.svg' })[0].text,
      'to contain',
      '<image href="bar.png"/>'
    );
  });
});
