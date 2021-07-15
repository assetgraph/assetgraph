const pathModule = require('path');
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');
const sinon = require('sinon');

describe('resolvers/data', function () {
  it('should handle a test case with data: url anchors', async function () {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(__dirname, '../../testdata/resolvers/data/'),
    });
    await assetGraph.loadAssets('dataUrl.html').populate();

    expect(assetGraph, 'to contain assets', 9);
    expect(
      assetGraph.findAssets({ type: 'Html' })[1].parseTree.body.firstChild
        .nodeValue,
      'to equal',
      '\u263a\n'
    );
    expect(
      assetGraph.findAssets({ type: 'Html' })[2].parseTree.body.firstChild
        .nodeValue,
      'to equal',
      'æøå\n'
    );
    expect(
      assetGraph.findAssets({ type: 'Html' })[3].text,
      'to match',
      /^<!DOCTYPE html>/
    );
    expect(assetGraph.findAssets({ type: 'Text' })[0].text, 'to equal', 'ΩδΦ');
    expect(
      assetGraph.findAssets({ type: 'Text' })[1].text,
      'to equal',
      'Hellö'
    );
    expect(
      assetGraph.findAssets({ type: 'Text' })[2].text,
      'to equal',
      'A brief note'
    );
    expect(assetGraph.findAssets({ type: 'Text' })[3].text, 'to equal', 'ΩδΦ');

    expect(
      assetGraph.findAssets({ type: 'Svg' })[0].text,
      'to equal',
      '<svg width="10" height="10" viewBox="0 0 20 38" xmlns="http://www.w3.org/2000/svg"><path d="M1.49 4.31l14 16.126.002-2.624-14 16.074-1.314 1.51 3.017 2.626 1.313-1.508 14-16.075 1.142-1.313-1.14-1.313-14-16.125L3.2.18.18 2.8l1.31 1.51z" /><text>🐭</text></svg>'
    );
  });

  it('should handle a test case with an unparsable data: url', async function () {
    const warnSpy = sinon.spy().named('warn');
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(__dirname, '../../testdata/resolvers/data/'),
    });
    await assetGraph
      .on('warn', warnSpy)
      .loadAssets('unparsableDataUrl.html')
      .populate();

    expect(assetGraph, 'to contain asset', { type: 'Image', url: 'data:foo' });

    expect(warnSpy, 'to have calls satisfying', () =>
      warnSpy(/^Cannot parse data url: data/)
    );
  });
});
