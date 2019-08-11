const pathModule = require('path');
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('transforms/convertStylesheetsToInlineStyles', function() {
  it('should convert all stylesheets to inline styles', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/convertStylesheetsToInlineStyles/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    expect(assetGraph, 'to contain assets', 6);
    expect(assetGraph, 'to contain asset', 'Html');
    expect(assetGraph, 'to contain asset', 'Png');
    expect(assetGraph, 'to contain assets', 'Css', 4);

    await assetGraph.convertStylesheetsToInlineStyles(
      { type: 'Html' },
      'screen'
    );

    expect(assetGraph, 'to contain assets', 7);
    expect(assetGraph, 'to contain no relations', {
      type: { $in: ['HtmlStyle', 'CssImport'] }
    });
    expect(assetGraph, 'to contain relations', 'HtmlStyleAttribute', 5);

    const document = assetGraph.findAssets({ type: 'Html' })[0].parseTree;
    expect(
      document.documentElement.getAttribute('style'),
      'to equal',
      'padding: 0'
    );
    expect(document.body.getAttribute('style'), 'to equal', 'padding: 0');
    expect(
      document.querySelectorAll('.a')[0].getAttribute('style'),
      'to equal',
      'padding: 0; color: red; background-image: url(foo.png); background-color: blue'
    );
    expect(
      document.querySelectorAll('.b')[0].getAttribute('style'),
      'to equal',
      'padding: 0; color: red; background-image: url(foo.png)'
    );
    expect(
      document.querySelectorAll('.c')[0].getAttribute('style'),
      'to equal',
      'font-weight: bold; padding: 0'
    );
  });
});
