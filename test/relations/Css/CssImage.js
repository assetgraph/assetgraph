const pathModule = require('path');
const expect = require('../../unexpected-with-plugins');
const AssetGraph = require('../../../lib/AssetGraph');

describe('relations/CssImage', function() {
  it('should handle a test case with a bunch of different CssImage relations', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../../testdata/relations/Css/CssImage/combo/'
      )
    });
    await assetGraph.loadAssets('index.css');
    await assetGraph.populate();

    expect(assetGraph, 'to contain relations', 'CssImage', 17);
    assetGraph.findAssets({
      fileName: 'foo.png'
    })[0].url = `${assetGraph.root}dir/foo2.png`;

    expect(
      assetGraph.findRelations({
        to: assetGraph.findAssets({ fileName: 'foo2.png' })[0]
      }),
      'to satisfy',
      [
        { href: 'dir/foo2.png' },
        { href: 'dir/foo2.png' },
        { href: 'dir/foo2.png' },
        { href: 'dir/foo2.png' },
        { href: 'dir/foo2.png' },
        { href: 'dir/foo2.png' },
        { href: 'dir/foo2.png' },
        { href: 'dir/foo2.png' },
        { href: 'dir/foo2.png' },
        { href: 'dir/foo2.png' },
        { href: 'dir/foo2.png' },
        { href: 'dir/foo2.png' },
        { href: 'dir/foo2.png' },
        { href: 'dir/foo2.png' },
        { href: 'dir/foo2.png' },
        { href: 'dir/foo2.png' },
        { href: 'dir/foo2.png' }
      ]
    );

    expect(
      assetGraph.findAssets({ fileName: 'index.css' })[0].text,
      'to match',
      /\.baz {\n {4}background-image: url\(dir\/foo2\.png\) !important/
    );
  });

  it('should handle a test case with three CssImage relations pointing at mouse cursors', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../../testdata/relations/Css/CssImage/mouseCursors/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    expect(assetGraph, 'to contain assets', 5);
    expect(assetGraph, 'to contain asset', 'Html');
    expect(assetGraph, 'to contain asset', 'Css');
    expect(assetGraph, 'to contain assets', 'Png', 3);
    expect(assetGraph, 'to contain relations', 'CssImage', 3);
  });

  it('should handle a test case with a CssImage relation inside a @media rule', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../../testdata/relations/Css/CssImage/mediaRule/'
      )
    });
    await assetGraph.loadAssets('relationInMediaRule.css');
    await assetGraph.populate();

    expect(assetGraph, 'to contain relations', 'CssImage', 2);
  });

  it('should handle a test case with multiple CSS filter urls', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../../testdata/relations/Css/CssImage/filter/'
      )
    });
    await assetGraph.loadAssets('index.css');
    await assetGraph.populate();

    expect(assetGraph, 'to contain asset', 'Css', 1);
    expect(assetGraph, 'to contain assets', { type: 'Svg', isLoaded: true }, 3);
    expect(assetGraph, 'to contain asset', { type: 'Svg', isInline: true });
  });

  it('should handle a test case with a singlequote in a background-image url(...)', async function() {
    const assetGraph = new AssetGraph();
    assetGraph.addAsset({
      type: 'Html',
      text: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style type="text/css">
                        .foo0 {
                            background-image: url("foo'bar.png");
                        }
                        .foo1 {
                            background-image: url('bar\\'quux.png');
                        }
                        .foo2 {
                            background-image: url("blah\\"baz.png");
                        }
                        .foo3 {
                            background-image: url('blerg"zyp.png');
                        }
                    </style>
                </head>
                <body></body>
                </html>
            `
    });

    expect(assetGraph, 'to contain assets', { type: 'Png' }, 4);
    for (const cssImage of assetGraph.findRelations({ type: 'CssImage' })) {
      cssImage.to.url += '.bogus';
    }
    const text = assetGraph.findAssets({ type: 'Css' })[0].text;
    expect
      .it('to contain', "'foo%27bar.png.bogus'")
      .and('to contain', "'bar%27quux.png.bogus'")
      .and('to contain', "'blah%22baz.png.bogus'")
      .and('to contain', "'blerg%22zyp.png.bogus'")(text);
  });

  it('should support detecting mask-image properties as relations', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../../testdata/relations/Css/CssImage/maskImage/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    expect(assetGraph, 'to contain relations', 'CssImage', 2);
  });
});
