const pathModule = require('path');
/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('relations/HtmlImageSrcSet, relations/SrcSet, relations/SrcSetEntry', async function() {
  it('should handle a test case with an existing <img srcset=...> element', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/relations/HtmlImageSrcSet/existing'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    expect(assetGraph, 'to contain assets', 6);
    expect(assetGraph, 'to contain relation', 'HtmlImage');
    expect(assetGraph, 'to contain relation', 'HtmlImageSrcSet');
    expect(assetGraph, 'to contain asset', 'SrcSet');
    expect(assetGraph, 'to contain relations', 'SrcSetEntry', 3);

    assetGraph.findAssets({ fileName: 'banner-phone.jpeg' })[0].url =
      'http://example.com/foo.jpg';

    expect(
      assetGraph.findAssets({ fileName: 'index.html' })[0].text,
      'to match',
      /srcset=\"banner-HD\.jpeg 2x, http:\/\/example.com\/foo\.jpg 100w, banner-phone-HD\.jpeg 100w 2x\"/
    );
  });

  it('should allow non-URL encoded commas in the srcset urls as long as they are not the first or the last character', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/relations/HtmlImageSrcSet/commas'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    expect(assetGraph, 'to contain assets', 4);
    expect(assetGraph, 'to contain relation', 'HtmlImageSrcSet');
    expect(assetGraph, 'to contain asset', 'SrcSet');
    expect(assetGraph, 'to contain relations', 'SrcSetEntry', 2);
    expect(assetGraph, 'to contain relations', 'SrcSetEntry', 2);

    expect(assetGraph, 'to contain asset', { fileName: 'banner-phone.jpeg' });
    expect(assetGraph, 'to contain asset', { fileName: 'banner,HD.jpeg' });

    assetGraph.findAssets({ fileName: 'banner,HD.jpeg' })[0].url =
      'http://example.com/foo.jpg';

    expect(
      assetGraph.findAssets({ fileName: 'index.html' })[0].text,
      'to contain',
      'srcset="http://example.com/foo.jpg 2x, banner-phone.jpeg?foo,bar 100w 2x"'
    );
  });
});
