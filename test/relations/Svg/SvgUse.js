const pathModule = require('path');
const expect = require('../../unexpected-with-plugins');
const AssetGraph = require('../../../lib/AssetGraph');

describe('relations/SvgUse', function() {
  it('should handle a test case with a <use xlink:href=...> referencing an external file', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../../testdata/relations/Svg/SvgUse/xlinkhref'
      )
    });
    await assetGraph.loadAssets('user.svg');
    await assetGraph.populate();

    expect(assetGraph, 'to contain relations', 'SvgUse', 1);
    expect(assetGraph, 'to contain assets', 'Svg', 2);
    assetGraph.findAssets({ fileName: 'gaussianBlur.svg' })[0].fileName =
      'foo.svg';
    expect(
      assetGraph.findAssets({ fileName: 'user.svg' })[0].text,
      'to contain',
      '<use xlink:href="foo.svg"/>'
    );
  });

  it('should handle a test case with a <use href=...> referencing an external file', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../../testdata/relations/Svg/SvgUse/href/'
      )
    });
    await assetGraph.loadAssets('user.svg');
    await assetGraph.populate();

    expect(assetGraph, 'to contain relations', 'SvgUse', 1);
    expect(assetGraph, 'to contain assets', 'Svg', 2);
    assetGraph.findAssets({ fileName: 'gaussianBlur.svg' })[0].fileName =
      'foo.svg';
    expect(
      assetGraph.findAssets({ fileName: 'user.svg' })[0].text,
      'to contain',
      '<use href="foo.svg"/>'
    );
  });
});
