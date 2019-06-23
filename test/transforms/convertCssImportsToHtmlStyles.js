const pathModule = require('path');
const expect = require('../unexpected-with-plugins');
const urlTools = require('urltools');
const AssetGraph = require('../../lib/AssetGraph');

// Helper for extracting all values of a specific property from a postcss rule
function getPropertyValues(container, propertyName) {
  return container.nodes
    .filter(function(node) {
      return node.prop === propertyName;
    })
    .map(function(node) {
      return node.value;
    });
}

describe('transforms/convertCssImportsToHtmlStyles', function() {
  it('should converting Css @import rules to <link rel="stylesheet">', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/convertCssImportsToHtmlStyles/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    expect(assetGraph, 'to contain asset', 'Html');
    expect(assetGraph, 'to contain asset', 'Png');
    expect(assetGraph, 'to contain assets', 'Css', 4);
    expect(assetGraph, 'to contain relations', 'CssImport', 3);
    expect(assetGraph, 'to contain relation', {
      type: 'CssImport',
      hrefType: 'rootRelative'
    });

    await assetGraph.convertCssImportsToHtmlStyles({ type: 'Html' });

    expect(assetGraph, 'to contain assets', 'Css', 4);
    expect(assetGraph, 'to contain relations', 'HtmlStyle', 4);
    expect(assetGraph, 'to contain relation', {
      type: 'HtmlStyle',
      hrefType: 'rootRelative'
    });
    expect(assetGraph, 'to contain no relations', { type: 'CssImport' });
    expect(
      assetGraph
        .findRelations({ type: 'HtmlStyle', to: { fileName: 'foo2.css' } })[0]
        .node.getAttribute('media'),
      'to equal',
      'print'
    );

    expect(
      assetGraph.findAssets({ type: 'Html' })[0].text.match(/href="([^'"]+)"/g),
      'to equal',
      ['href="foo2.css"', 'href="foo.css"', 'href="/bar.css"']
    );

    await assetGraph.bundleRelations({ type: 'HtmlStyle' });

    expect(assetGraph, 'to contain relations', 'HtmlStyle', 2);
    expect(
      assetGraph
        .findRelations({ type: 'HtmlStyle' })[0]
        .node.getAttribute('media'),
      'to equal',
      'print'
    );
    expect(
      assetGraph
        .findRelations({ type: 'HtmlStyle' })[1]
        .node.hasAttribute('media'),
      'to be false'
    );
    expect(assetGraph, 'to contain assets', 'Css', 2);

    let cssAsset = assetGraph.findAssets({ type: 'Css' })[0];
    expect(cssAsset.parseTree.nodes, 'to have length', 1);
    expect(
      getPropertyValues(cssAsset.parseTree.nodes[0], 'background-color'),
      'to equal',
      ['maroon']
    );

    cssAsset = assetGraph.findAssets({ type: 'Css' })[1];
    expect(cssAsset.parseTree.nodes, 'to have length', 3);
    expect(
      getPropertyValues(cssAsset.parseTree.nodes[0], 'color'),
      'to equal',
      ['teal']
    );
    expect(
      getPropertyValues(cssAsset.parseTree.nodes[1], 'color'),
      'to equal',
      ['tan']
    );
    expect(
      getPropertyValues(cssAsset.parseTree.nodes[2], 'color'),
      'to equal',
      ['blue']
    );

    assetGraph.findAssets({ type: 'Html' })[0].url = urlTools.resolveUrl(
      assetGraph.root,
      'subdir/index2.html'
    );
    expect(
      assetGraph.findRelations({ type: 'CssAlphaImageLoader' })[0].href,
      'to equal',
      '/foo.png'
    );
  });
});
