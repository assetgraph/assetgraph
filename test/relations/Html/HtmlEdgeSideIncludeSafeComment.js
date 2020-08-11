const pathModule = require('path');
const expect = require('../../unexpected-with-plugins');
const AssetGraph = require('../../../lib/AssetGraph');

describe('relations/HtmlEdgeSideIncludeSafeComment', function () {
  it('should handle a test case with existing <!--esi ...---> comments', async function () {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../../testdata/relations/Html/HtmlEdgeSideIncludeSafeComment/'
      ),
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    expect(assetGraph, 'to contain assets', 3);
    expect(assetGraph, 'to contain asset', { type: 'Html', isInline: true });
    expect(assetGraph, 'to contain asset', { type: 'Html', isInline: false });
    expect(assetGraph, 'to contain asset', 'Png');
    expect(assetGraph, 'to contain relation', 'HtmlEdgeSideIncludeSafeComment');

    assetGraph.findAssets({ type: 'Html', isInline: false })[0].minify();

    // the <!--esi ...--> should still be there
    expect(
      assetGraph.findAssets({ type: 'Html', isInline: false })[0].text,
      'to match',
      /<!--esi.*-->/
    );
  });
});
