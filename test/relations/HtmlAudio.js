const pathModule = require('path');
const expect = require('../unexpected-with-plugins');
const _ = require('lodash');
const AssetGraph = require('../../lib/AssetGraph');

describe('relations/HtmlAudio', function() {
  it('should handle a test case with existing <audio> tags', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(__dirname, '../../testdata/relations/HtmlAudio/')
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate({
      startAssets: { type: 'Html' },
      followRelations: () => false
    });

    expect(assetGraph, 'to contain relations', 'HtmlAudio', 4);

    assetGraph.findAssets({ type: 'Html' })[0].url =
      'http://example.com/foo/bar.html';
    assetGraph.findRelations().forEach(function(relation) {
      relation.hrefType = 'relative';
    });

    expect(assetGraph.findRelations(), 'to satisfy', [
      { href: '../sound.mp3' },
      { href: '../sound.wav' },
      { href: '../sound.wma' },
      { href: '../sound.flac' }
    ]);
  });
});
