const pathModule = require('path');
/* global describe, it */
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');
const proxyquire = require('proxyquire');
const sinon = require('sinon');

describe('transforms.autoprefixer', function() {
  describe('if autoprefixer is not available', function() {
    const autoprefixerTransform = proxyquire(
      '../../lib/transforms/autoprefixer',
      {
        autoprefixer: null,
        'autoprefixer/package.json': null
      }
    );

    it('should emit an info event', async function() {
      const assetGraph = new AssetGraph({
        root: pathModule.resolve(
          __dirname,
          '../../testdata/transforms/autoprefixer/'
        )
      });
      await assetGraph.loadAssets('index.html');
      await assetGraph.populate();
      const infoSpy = sinon.spy();
      assetGraph.on('info', infoSpy);
      await autoprefixerTransform()(assetGraph);
      await expect(infoSpy, 'to have calls satisfying', () => {
        infoSpy(
          new Error(
            `autoprefixer transform: Found 2 css assets, but no autoprefixer module is available. Please use npm to install autoprefixer in your project so the autoprefixer transform can require it.\nCannot find module 'autoprefixer/package.json'`
          )
        );
      });
    });
  });

  it('should handle an unprefixed test case', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/autoprefixer/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    expect(assetGraph, 'to contain relations', 'HtmlStyle', 2);
    expect(assetGraph, 'to contain relations', 'CssImage', 1);

    await assetGraph.autoprefixer('last 100 versions');

    expect(assetGraph, 'to contain relations', 'HtmlStyle', 2);
    expect(assetGraph, 'to contain relations', 'CssImage', 4);
  });

  it('should handle a simple option case', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/autoprefixer/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();
    await assetGraph.autoprefixer('last 2 versions');
  });

  it('should handle a complex option case', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/autoprefixer/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();
    await assetGraph.autoprefixer('last 2 versions, ie > 8,ff > 28');
  });

  it('should preserve source information', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/autoprefixer/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    assetGraph.findAssets({ type: 'Css' })[0].parseTree.source.input.file =
      'http://example.com/style.css';

    await assetGraph.autoprefixer('last 2 versions, ie > 8,ff > 28', {
      sourceMaps: true
    });

    expect(assetGraph.findAssets({ type: 'Css' })[0].sourceMap, 'to satisfy', {
      sources: expect.it('to contain', 'http://example.com/style.css')
    });
  });

  it('should preserve source maps', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/autoprefixer/existingExternalSourceMap'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    expect(assetGraph, 'to contain asset', 'Css');
    expect(assetGraph, 'to contain asset', 'SourceMap');

    await assetGraph.autoprefixer('last 2 versions, ie > 8,ff > 28', {
      sourceMaps: true
    });

    expect(assetGraph, 'to contain asset', 'Css');
    expect(
      assetGraph.findAssets({ type: 'Css' })[0].text,
      'to contain',
      'sourceMappingURL'
    );
    expect(assetGraph, 'to contain asset', 'SourceMap');
    expect(
      assetGraph.findAssets({ type: 'SourceMap' })[0].parseTree.sources,
      'to contain',
      'foo.less'
    );
  });
});
