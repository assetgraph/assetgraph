const pathModule = require('path');
const expect = require('../../unexpected-with-plugins');
const AssetGraph = require('../../../lib/AssetGraph');

describe('relations/HtmlPictureSource test', function () {
  it('should handle a test case with an existing <picture><source src="..."></picture> construct', async function () {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../../testdata/relations/Html/HtmlPictureSource/'
      ),
    });
    await assetGraph.loadAssets('index.html').populate({
      followRelations: () => false,
    });

    expect(assetGraph, 'to contain relations', 'HtmlPictureSource', 2);
    assetGraph.findAssets({ type: 'Html' })[0].url =
      'http://example.com/foo/bar.html';
    assetGraph.findRelations().forEach(function (relation) {
      relation.hrefType = 'relative';
    });
    expect(assetGraph.findRelations(), 'to satisfy', [
      { href: '../image.png' },
      { href: '../otherImage.jpg' },
    ]);
  });
});
