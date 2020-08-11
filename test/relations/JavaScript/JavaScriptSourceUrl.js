const pathModule = require('path');
const expect = require('../../unexpected-with-plugins');
const AssetGraph = require('../../../lib/AssetGraph');

describe('relations/JavaScriptSourceUrl', function () {
  it('should handle a test case with an existing bundle that has @sourceURL directives', async function () {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../../testdata/relations/JavaScript/JavaScriptSourceUrl/existingBundle/'
      ),
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    expect(assetGraph, 'to contain assets', 4);
    expect(assetGraph, 'to contain relations', 'JavaScriptSourceUrl', 2);

    assetGraph.findAssets({ fileName: 'bundle.js' })[0].markDirty();

    const javaScript = assetGraph.findAssets({ fileName: 'bundle.js' })[0];
    expect(javaScript.text, 'to match', /@\s*sourceURL=bar\.js/);
    expect(javaScript.text, 'to match', /@\s*sourceURL=foo\.js/);

    assetGraph.findAssets({
      fileName: 'bundle.js',
    })[0].url = `${assetGraph.root}foo/bundle.js`;

    expect(javaScript.text, 'to match', /@\s*sourceURL=..\/bar\.js/);
    expect(javaScript.text, 'to match', /@\s*sourceURL=..\/foo\.js/);
  });

  it('should handle a test case with two JavaScript assets, then running the addJavaScriptSourceUrl transform', async function () {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../../testdata/relations/JavaScript/JavaScriptSourceUrl/bundleRelations/'
      ),
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();
    await assetGraph.addJavaScriptSourceUrl();

    expect(assetGraph, 'to contain relations', 'JavaScriptSourceUrl', 2);

    expect(
      assetGraph.findAssets({ fileName: 'foo.js' })[0].text,
      'to match',
      /#\s*sourceURL=\/foo\.js/
    );
    expect(
      assetGraph.findAssets({ fileName: 'bar.js' })[0].text,
      'to match',
      /#\s*sourceURL=\/bar\.js/
    );

    await assetGraph.bundleRelations({ type: 'HtmlScript' });

    expect(assetGraph, 'to contain assets', 'JavaScript', 3);
    expect(
      assetGraph.findAssets({ type: 'JavaScript' }).pop().text,
      'to match',
      /\/\/\s*#\ssourceURL=\/foo\.js[\s\S]*\/\/\s*#\s*sourceURL=\/bar\.js/
    );
  });
});
