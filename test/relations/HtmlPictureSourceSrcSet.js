const pathModule = require('path');
/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('relations/HtmlPictureSourceSrcSet', function() {
  it('should handle a test case with an existing <picture srcset="..."> element', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/relations/HtmlPictureSourceSrcSet/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    expect(assetGraph, 'to contain relations', 'HtmlPictureSourceSrcSet', 3);
    expect(assetGraph, 'to contain assets', 'SrcSet', 3);
    expect(assetGraph, 'to contain relations', 'SrcSetEntry', 6);
    expect(assetGraph, 'to contain assets', 'Jpeg', 6);

    assetGraph.findAssets({ fileName: 'large-2.jpg' })[0].fileName =
      'reallyLarge.jpg';
    assetGraph.findAssets({ fileName: 'med-2.jpg' })[0].fileName =
      'reallyMed.jpg';
    assetGraph.findAssets({ fileName: 'small-2.jpg' })[0].fileName =
      'reallySmall.jpg';

    expect(
      assetGraph
        .findRelations({ type: 'HtmlPictureSourceSrcSet' })
        .map(function(htmlPictureSourceSrcSet) {
          return htmlPictureSourceSrcSet.node.outerHTML;
        }),
      'to equal',
      [
        '<source media="(min-width: 45em)" srcset="large-1.jpg 1x, reallyLarge.jpg 2x">',
        '<source media="(min-width: 18em)" srcset="med-1.jpg 1x, reallyMed.jpg 2x">',
        '<source srcset="small-1.jpg 1x, reallySmall.jpg 2x">'
      ]
    );
  });
});
