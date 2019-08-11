const pathModule = require('path');
const expect = require('./unexpected-with-plugins');
const AssetGraph = require('../lib/AssetGraph');

describe('#addAssets', function() {
  it('should support a single url passed as a string', function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../testdata/transforms/loadAssets/simple/'
      )
    });

    assetGraph.addAssets('index.html');

    expect(assetGraph, 'to contain asset', 'Html');
  });

  it('should support an array of urls', function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../testdata/transforms/loadAssets/simple/'
      )
    });

    assetGraph.addAssets(['index.html', 'index2.html']);

    expect(assetGraph, 'to contain assets', 'Html', 2);
  });

  it('should support multiple urls as varargs', function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../testdata/transforms/loadAssets/simple/'
      )
    });
    assetGraph.addAssets('index.html', 'index2.html');

    expect(assetGraph, 'to contain assets', 'Html', 2);
  });

  it('should support an asset config object', function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../testdata/transforms/loadAssets/simple/'
      )
    });
    assetGraph.addAssets({
      type: 'Html',
      url: 'http://example.com/index.html',
      text:
        '<!DOCTYPE html><html><head></head><body><script>alert("Hello!");</script></body></html>'
    });

    expect(assetGraph, 'to contain asset', 'Html');
    expect(assetGraph, 'to contain asset', 'JavaScript');
  });

  describe('with an array', function() {
    it('should add all the asset configs to the graph and return the created instances', async function() {
      const assetGraph = new AssetGraph();
      const assets = assetGraph.addAssets([
        {
          type: 'Css',
          url: 'https://example.com/styles.css',
          text: 'body { color: teal; }'
        },
        {
          type: 'Css',
          url: 'https://example.com/moreStyles.css',
          text: 'body { color: teal; }'
        }
      ]);

      expect(assetGraph.findAssets(), 'to satisfy', [
        { isAsset: true, url: 'https://example.com/styles.css' },
        { isAsset: true, url: 'https://example.com/moreStyles.css' }
      ]);
      expect(assetGraph, 'to contain asset', {
        url: 'https://example.com/styles.css'
      }).and('to contain asset', {
        url: 'https://example.com/moreStyles.css'
      });

      expect(assets, 'to satisfy', [
        { url: 'https://example.com/styles.css' },
        { url: 'https://example.com/moreStyles.css' }
      ]);
    });
  });

  describe('with a glob pattern', function() {
    it('should add all the matched assets to the graph and return them', async function() {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../testdata/transforms/loadAssets/glob/'
        )
      });

      const assets = assetGraph.addAssets('*.html');

      expect(assetGraph.findAssets(), 'to satisfy', [
        { fileName: 'index1.html' },
        { fileName: 'index2.html' }
      ]);
      expect(assetGraph, 'to contain asset', {
        fileName: 'index1.html'
      }).and('to contain asset', {
        fileName: 'index2.html'
      });

      expect(assets, 'to satisfy', [
        { fileName: 'index1.html' },
        { fileName: 'index2.html' }
      ]);
    });
  });

  describe('with a single asset config object', function() {
    it('should create and add the asset and return it in an array', async function() {
      const assetGraph = new AssetGraph();
      const assets = assetGraph.addAssets({
        type: 'Css',
        url: 'https://example.com/styles.css'
      });
      expect(assetGraph.findAssets(), 'to satisfy', [
        { url: 'https://example.com/styles.css' }
      ]);

      expect(assets, 'to satisfy', [{ url: 'https://example.com/styles.css' }]);
    });
  });
});
