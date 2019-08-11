const pathModule = require('path');
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('relations/SvgFontFaceUri', function() {
  it('should handle a test case with a <font-face-uri xlink:href=...> referencing an external file', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/relations/SvgFontFaceUri/xlinkhref/'
      )
    });
    await assetGraph.loadAssets('image.svg');
    await assetGraph.populate();

    expect(assetGraph, 'to contain asset', 'Svg');
    expect(assetGraph, 'to contain relations', 'SvgFontFaceUri', 1);
    assetGraph.findAssets({ fileName: 'fontawesome-webfont.ttf' })[0].fileName =
      'foo.ttf';
    expect(
      assetGraph.findAssets({ fileName: 'image.svg' })[0].text,
      'to contain',
      '<font-face-uri xlink:href="foo.ttf"/>'
    );
  });

  it('should handle a test case with a <font-face-uri href=...> referencing an external file', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/relations/SvgFontFaceUri/href/'
      )
    });
    await assetGraph.loadAssets('image.svg');
    await assetGraph.populate();

    expect(assetGraph, 'to contain asset', 'Svg');
    expect(assetGraph, 'to contain relations', 'SvgFontFaceUri', 1);
    assetGraph.findAssets({ fileName: 'fontawesome-webfont.ttf' })[0].fileName =
      'foo.ttf';
    expect(
      assetGraph.findAssets({ fileName: 'image.svg' })[0].text,
      'to contain',
      '<font-face-uri href="foo.ttf"/>'
    );
  });
});
