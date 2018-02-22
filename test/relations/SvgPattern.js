const pathModule = require('path');
/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('relations/SvgPattern', function() {
  it('should handle a test case with a <pattern xlink:href=...> referencing an external file', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/relations/SvgPattern/xlinkhref/'
      )
    });
    await assetGraph.loadAssets('pattern.svg');
    await assetGraph.populate();

    expect(assetGraph, 'to contain assets', 'Svg', 2);
    expect(assetGraph, 'to contain relations', 'SvgPattern', 1);
    assetGraph.findAssets({ fileName: 'gaussianBlur.svg' })[0].fileName =
      'foo.svg';
    expect(
      assetGraph.findAssets({ fileName: 'pattern.svg' })[0].text,
      'to contain',
      '<pattern xlink:href="foo.svg" '
    );
  });

  it('should handle a test case with a <pattern href=...> referencing an external file', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/relations/SvgPattern/href/'
      )
    });
    await assetGraph.loadAssets('pattern.svg');
    await assetGraph.populate();

    expect(assetGraph, 'to contain assets', 'Svg', 2);
    expect(assetGraph, 'to contain relations', 'SvgPattern', 1);
    assetGraph.findAssets({ fileName: 'gaussianBlur.svg' })[0].fileName =
      'foo.svg';
    expect(
      assetGraph.findAssets({ fileName: 'pattern.svg' })[0].text,
      'to contain',
      '<pattern href="foo.svg" '
    );
  });
});
