const pathModule = require('path');
const expect = require('../../unexpected-with-plugins');
const AssetGraph = require('../../../lib/AssetGraph');

describe('relations/CssAlphaImageLoader', function() {
  it('should handle a simple test case', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../../testdata/relations/Css/CssAlphaImageLoader/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    expect(assetGraph, 'to contain relations', 'CssAlphaImageLoader', 3);

    assetGraph.findAssets({
      fileName: 'foo.png'
    })[0].url = `${assetGraph.root}images/quux.png`;

    expect(
      assetGraph.findRelations({ type: 'CssAlphaImageLoader' }),
      'to satisfy',
      [
        { href: '/images/quux.png' },
        { href: '/bar.png' },
        { href: '/images/quux.png' }
      ]
    );
    const cssRules = assetGraph.findAssets({ type: 'Css' })[0].parseTree.nodes;
    expect(
      cssRules[0].nodes[0].value,
      'to match',
      /src='\/images\/quux\.png'.*src='\/bar\.png'/
    );
    expect(cssRules[1].nodes[0].value, 'to match', /src='\/images\/quux\.png'/);

    assetGraph.findRelations({ type: 'CssAlphaImageLoader' })[0].detach();
    assetGraph.findRelations({ type: 'CssAlphaImageLoader' })[1].detach();

    expect(
      assetGraph.findAssets({ type: 'Css' })[0].text,
      'to contain',
      'body {\n}'
    ).and('to contain', 'div {\n}');
  });
});
