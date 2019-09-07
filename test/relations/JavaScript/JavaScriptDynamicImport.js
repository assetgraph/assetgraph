const expect = require('../../unexpected-with-plugins');
const AssetGraph = require('../../../lib/AssetGraph');
const pathModule = require('path');

describe('JavaScriptDynamicImport', function() {
  it('should detect a relation', function() {
    const javaScript = new AssetGraph().addAsset({
      type: 'JavaScript',
      url: 'https://example.com/',
      text: `
        import('./bar/quux.js');
      `
    });

    expect(javaScript.outgoingRelations, 'to satisfy', [
      {
        type: 'JavaScriptDynamicImport',
        href: './bar/quux.js',
        to: { url: 'https://example.com/bar/quux.js' }
      }
    ]);
  });

  it('should update the href of a relation', function() {
    const javaScript = new AssetGraph().addAsset({
      type: 'JavaScript',
      url: 'https://example.com/',
      text: `
        import('./bar/quux.js');
      `
    });

    javaScript.outgoingRelations[0].href = './blabla.js';
    javaScript.markDirty();
    expect(javaScript.text, 'to contain', "import('./blabla.js');");
  });

  it('should keep ./ in front of relative urls', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../../testdata/relations/JavaScript/JavaScriptDynamicImport/relative/'
      )
    });
    const [javaScript] = await assetGraph.loadAssets('index.js');
    await assetGraph.populate();
    expect(javaScript.text, 'to contain', `import('./main.js');`);
    assetGraph.findAssets({
      fileName: 'main.js'
    })[0].url = `${assetGraph.root}static/foobar.js`;
    expect(javaScript.text, 'to contain', `import('./static/foobar.js');`);
  });

  it('should put ./ in front of the url when the hrefType is changed to relative', function() {
    const assetGraph = new AssetGraph();
    const javaScript = assetGraph.addAsset({
      type: 'JavaScript',
      url: `${assetGraph.root}index.js`,
      text: `
        import('${assetGraph.root}foo.js');
      `
    });

    javaScript.outgoingRelations[0].hrefType = 'relative';
    expect(javaScript.text, 'to contain', "import('./foo.js');");
  });

  it('should leave a "bare" package name alone when moving the file', function() {
    const assetGraph = new AssetGraph();
    const javaScript = assetGraph.addAsset({
      type: 'JavaScript',
      url: `${assetGraph.root}index.js`,
      text: `
        import('foo');
      `
    });

    javaScript.url = `${assetGraph.root}somewhere/else.js`;
    expect(javaScript.text, 'to contain', "import('foo');");
  });
});
