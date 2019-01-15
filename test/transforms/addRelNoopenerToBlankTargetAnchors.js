const pathModule = require('path');
/* global describe, it */
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('transforms/addRelNoopenerToBlankTargetAnchors', function() {
  it('should add rel="noopener" attribute to relevant anchors', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/transforms/addRelNoopenerToBlankTargetAnchors/'
      )
    });
    await assetGraph.loadAssets('index.html');

    let anchorRels = assetGraph
      .findRelations()
      .map(relation => relation.node.getAttribute('rel'));

    expect(anchorRels, 'to satisfy', [
      null,
      null,
      'nofollow',
      'noopener',
      null,
      null,
      'nofollow',
      'noopener',
      'opener'
    ]);

    await assetGraph.addRelNoopenerToBlankTargetAnchors();

    anchorRels = assetGraph
      .findRelations()
      .map(relation => relation.node.getAttribute('rel'));

    expect(anchorRels, 'to satisfy', [
      null,
      null,
      'nofollow',
      'noopener',
      null,
      'noopener',
      'nofollow noopener',
      'noopener',
      'opener'
    ]);
  });
});
