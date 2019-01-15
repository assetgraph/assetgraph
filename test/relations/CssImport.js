const pathModule = require('path');
/* global describe, it */
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('relations/CssImport', function() {
  it('should handle a simple test case', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(__dirname, '../../testdata/relations/CssImport/')
    });
    await assetGraph.loadAssets('index.css');
    await assetGraph.populate();

    expect(assetGraph, 'to contain assets', 'Css', 2);
    expect(assetGraph, 'to contain relation', 'CssImport');
    assetGraph.findRelations({ type: 'CssImport' })[0].detach();
    expect(
      assetGraph.findAssets({ fileName: 'index.css' })[0].parseTree.nodes,
      'to have length',
      1
    );
  });

  it('should support attaching a new relation and creating an external target asset', function() {
    const cssAsset = new AssetGraph().addAsset({
      type: 'Css',
      url: 'https://example.com/styles.css',
      text: 'body { color: maroon; }'
    });
    cssAsset.addRelation(
      {
        type: 'CssImport',
        to: {
          type: 'Css',
          url: 'https://example.com/moreStyles.css',
          text: 'body { color: maroon; }'
        }
      },
      'last'
    );
    expect(cssAsset.text, 'to contain', 'import "moreStyles.css";');
  });

  it('should support attaching a new relation and creating an inline target asset', function() {
    const cssAsset = new AssetGraph().addAsset({
      type: 'Css',
      url: 'https://example.com/styles.css',
      text: 'body { color: maroon; }'
    });
    cssAsset.addRelation(
      {
        type: 'CssImport',
        hrefType: 'inline',
        to: {
          type: 'Css',
          text: 'body { color: maroon; }'
        }
      },
      'last'
    );
    expect(
      cssAsset.text,
      'to contain',
      'import "data:text/css;base64,Ym9keSB7IGNvbG9yOiBtYXJvb247IH0=";'
    );
  });

  it('should support attaching a new relation and creating an inline target asset with an explicit hrefType', function() {
    const cssAsset = new AssetGraph().addAsset({
      type: 'Css',
      url: 'https://example.com/styles.css',
      text: 'body { color: maroon; }'
    });
    cssAsset.addRelation(
      {
        type: 'CssImport',
        hrefType: 'inline',
        to: {
          type: 'Css',
          text: 'body { color: maroon; }'
        }
      },
      'last'
    );
    expect(
      cssAsset.text,
      'to contain',
      'import "data:text/css;base64,Ym9keSB7IGNvbG9yOiBtYXJvb247IH0=";'
    );
  });

  it('should support the media property when attaching a new relation', function() {
    const cssAsset = new AssetGraph().addAsset({
      type: 'Css',
      url: 'http://example.com/styles.css',
      text: 'body { color: maroon; }'
    });
    cssAsset.addRelation(
      {
        type: 'CssImport',
        media: 'projection',
        to: {
          type: 'Css',
          url: 'http://example.com/moreStyles.css',
          text: 'body { color: maroon; }'
        }
      },
      'last'
    );

    expect(cssAsset.text, 'to contain', 'import "moreStyles.css" projection;');
  });
});
