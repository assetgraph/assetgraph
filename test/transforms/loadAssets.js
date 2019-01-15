const pathModule = require('path');
/* global describe, it */
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('transforms/loadAssets', function() {
  it('should support a single url passed as a string', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/loadAssets/simple/'
      )
    });
    await assetGraph.loadAssets('index.html');

    expect(assetGraph, 'to contain asset', 'Html');
    expect(assetGraph, 'to contain asset', 'JavaScript');
  });

  it('should support an array of urls', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/loadAssets/simple/'
      )
    });
    await assetGraph.loadAssets(['index.html', 'index2.html']);

    expect(assetGraph, 'to contain assets', 'Html', 2);
    expect(assetGraph, 'to contain asset', 'JavaScript');
    expect(assetGraph, 'to contain asset', 'Css');
  });

  it('should support multiple urls as varargs', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/loadAssets/simple/'
      )
    });
    await assetGraph.loadAssets('index.html', 'index2.html');

    expect(assetGraph, 'to contain assets', 'Html', 2);
    expect(assetGraph, 'to contain asset', 'JavaScript');
    expect(assetGraph, 'to contain asset', 'Css');
  });

  it('should support an asset config object', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/loadAssets/simple/'
      )
    });
    await assetGraph.loadAssets({
      type: 'Html',
      url: 'http://example.com/index.html',
      text:
        '<!DOCTYPE html><html><head></head><body><script>alert("Hello!");</script></body></html>'
    });

    expect(assetGraph, 'to contain asset', 'Html');
    expect(assetGraph, 'to contain asset', 'JavaScript');
  });

  it('should support the keepUnpopulated option', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/loadAssets/simple/'
      )
    });
    await assetGraph.loadAssets({
      type: 'Html',
      keepUnpopulated: true,
      url: 'http://example.com/index.html',
      text:
        '<!DOCTYPE html><html><head></head><body><script>alert("Hello!");</script></body></html>'
    });

    expect(assetGraph, 'to contain asset', 'Html');
    expect(assetGraph, 'to contain no assets', 'JavaScript');
    expect(
      assetGraph.findAssets({ type: 'Html' })[0],
      'not to have property',
      '_parseTree'
    );
  });

  describe('with an array', function() {
    it('should add all the asset configs to the graph and return the created instances', async function() {
      const assetGraph = new AssetGraph();
      await assetGraph.loadAssets([
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
        { url: 'https://example.com/styles.css' },
        { url: 'https://example.com/moreStyles.css' }
      ]);
      expect(assetGraph, 'to contain asset', {
        url: 'https://example.com/styles.css'
      }).and('to contain asset', {
        url: 'https://example.com/moreStyles.css'
      });
    });
  });

  describe('with a glob pattern', function() {
    it('should add all the matched assets to the graph and return them', async function() {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/transforms/loadAssets/glob/'
        )
      });

      const assets = await assetGraph.loadAssets('*.html');

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

  describe('with a glob pattern in a file: url', function() {
    it('should add all the matched assets to the graph and return them', async function() {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/transforms/loadAssets/glob/'
        )
      });

      const assets = await assetGraph.loadAssets(`${assetGraph.root}/*.html`);

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
      const assets = await assetGraph.loadAssets({
        type: 'Css',
        url: 'https://example.com/styles.css',
        text: 'body { background-image: url(https://example.com/foo.png); }'
      });
      expect(assetGraph.findAssets(), 'to satisfy', [
        { url: 'https://example.com/styles.css' },
        { url: 'https://example.com/foo.png' }
      ]);
      expect(assetGraph, 'to contain asset', {
        type: 'Png',
        url: 'https://example.com/foo.png',
        isLoaded: false
      });

      expect(assets, 'to satisfy', [{ url: 'https://example.com/styles.css' }]);
    });
  });
});
