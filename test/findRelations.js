/* global describe, it */
const expect = require('./unexpected-with-plugins');
const AssetGraph = require('../lib/AssetGraph');

describe('AssetGraph.findRelations', function() {
  it('should handle a simple test case', async function() {
    const assetGraph = new AssetGraph();
    await assetGraph.loadAssets(
      new AssetGraph().addAsset({
        type: 'Html',
        url: 'a',
        text: 'a',
        foo: 'bar'
      }),
      new AssetGraph().addAsset({
        type: 'Html',
        url: 'b',
        text: 'b',
        foo: 'bar'
      }),
      new AssetGraph().addAsset({
        type: 'Html',
        url: 'c',
        text: 'c',
        foo: 'quux'
      }),
      new AssetGraph().addAsset({
        type: 'Css',
        url: 'd',
        text: 'body { color: #ddd; }',
        foo: 'baz'
      }),
      new AssetGraph().addAsset({
        type: 'Css',
        url: 'e',
        text: 'body { color: #eee; }'
      }),
      new AssetGraph().addAsset({
        type: 'Png',
        url: 'f',
        rawSrc: Buffer.from('f'),
        foo: 'baz'
      })
    );

    const aHtml = assetGraph.findAssets({ text: 'a' })[0];
    const bHtml = assetGraph.findAssets({ text: 'b' })[0];
    aHtml.addRelation(
      {
        type: 'HtmlStyle',
        to: assetGraph.findAssets({ text: 'body { color: #ddd; }' })[0]
      },
      'last'
    );
    aHtml.addRelation(
      {
        type: 'HtmlAnchor',
        to: bHtml,
        node: aHtml.parseTree.createElement('a')
      },
      'last'
    );
    aHtml.addRelation(
      {
        type: 'HtmlAnchor',
        to: assetGraph.findAssets({ text: 'c' })[0],
        node: aHtml.parseTree.createElement('a')
      },
      'last'
    );
    bHtml.addRelation(
      {
        type: 'HtmlAnchor',
        to: assetGraph.findAssets({ text: 'c' })[0],
        node: aHtml.parseTree.createElement('a')
      },
      'last'
    );
    bHtml.addRelation(
      {
        type: 'HtmlStyle',
        to: assetGraph.findAssets({ text: 'body { color: #eee; }' })[0]
      },
      'last'
    );

    const dCss = assetGraph.findAssets({ text: 'body { color: #ddd; }' })[0];
    const dCssNode = dCss.parseTree.nodes[0].append(
      'background-image: url(...)'
    );
    const dCssPropertyNode = dCssNode.nodes[dCssNode.nodes.length - 1];
    dCss.markDirty();
    dCss.addRelation(
      {
        type: 'CssImage',
        to: assetGraph.findAssets({ type: 'Png' })[0],
        parentNode: dCss.parseTree,
        propertyNode: dCssPropertyNode,
        node: dCssNode
      },
      'last'
    );

    const eCss = assetGraph.findAssets({ text: 'body { color: #eee; }' })[0];
    const eCssNode = eCss.parseTree.nodes[0].append(
      'background-image: url(...)'
    );
    const eCssPropertyNode = eCssNode.nodes[dCssNode.nodes.length - 1];
    dCss.markDirty();
    assetGraph.findAssets({ text: 'body { color: #eee; }' })[0].addRelation(
      {
        type: 'CssImage',
        to: assetGraph.findAssets({ type: 'Png' })[0],
        parentNode: eCss.parseTree,
        propertyNode: eCssPropertyNode,
        node: eCssNode
      },
      'last'
    );

    expect(assetGraph, 'to contain relations', 'CssImage', 2);
    expect(
      assetGraph,
      'to contain relations',
      {
        type: 'HtmlAnchor',
        from: aHtml
      },
      2
    );
    expect(
      assetGraph,
      'to contain relations',
      {
        type: 'HtmlAnchor',
        to: {
          text: 'c',
          foo: 'quux'
        }
      },
      2
    );
    expect(
      assetGraph,
      'to contain relations',
      {
        type: { $in: ['HtmlAnchor', 'HtmlStyle'] },
        from: {
          text: { $in: [aHtml.text, bHtml.text] }
        },
        to: {
          type: { $in: ['Html', 'Css'] }
        }
      },
      5
    );
    expect(
      assetGraph,
      'to contain relations',
      {
        type: { $regex: /CssIm|HtmlAn/ },
        from: {
          text: { $regex: /^a|#ddd/ }
        }
      },
      3
    );
    expect(assetGraph, 'to contain relation', {
      type: /Style/,
      from: {
        text: { $regex: /^a<link rel=/ }
      }
    });
    expect(
      assetGraph,
      'to contain relations',
      {
        type: { $not: 'CssImage' },
        from: {
          text: { $not: /^a<link rel=/ }
        }
      },
      2
    );
    expect(
      assetGraph,
      'to contain relations',
      {
        from: {
          foo(val) {
            return typeof val !== 'undefined';
          }
        }
      },
      6
    );
    expect(assetGraph, 'to contain relation', {
      from: {
        foo(val) {
          return typeof val === 'undefined';
        }
      }
    });
  });
});
