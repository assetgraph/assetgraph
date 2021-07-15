const pathModule = require('path');
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');
const sinon = require('sinon');

describe('transforms/writeAssetsToDisc', function () {
  it('should emit an error instead of attempting to write a file with an empty file name', async function () {
    const assetGraph = new AssetGraph();
    const warnSpy = sinon.spy().named('warn');
    assetGraph.on('warn', warnSpy);
    assetGraph.addAsset({
      type: 'Html',
      url: 'https://www.example.com/',
      text: 'foo',
    });

    await assetGraph.writeAssetsToDisc(
      {},
      '/tmp/foo',
      'https://www.example.com/'
    );

    expect(warnSpy, 'to have calls satisfying', () => {
      warnSpy(
        new Error(
          'Skipping https://www.example.com/ -- cannot write an empty file name to disc. Consider renaming it to index.html'
        )
      );
    });
  });

  it('should not emit an error when writing a graph with FileRedirects', async function () {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/writeAssetsToDisc/fileRedirects/'
      ),
    });
    const warnSpy = sinon.spy().named('warn');
    assetGraph.on('warn', warnSpy);

    await assetGraph.loadAssets('index.html');

    await assetGraph.populate();

    await assetGraph.writeAssetsToDisc({ isLoaded: true }, '/tmp/foo');

    expect(warnSpy, 'was not called');
  });
});
