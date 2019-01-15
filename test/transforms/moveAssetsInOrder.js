/* global describe, it */
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('transforms/moveAssetsInOrder', function() {
  it('should throw if mandatory second argument is missing', function() {
    const tq = new AssetGraph({
      root: 'http://www.example.com/blah/'
    }).loadAssets({
      type: 'Html',
      text: 'foo',
      url: 'http://www.example.com/blah/quux.html'
    });

    expect(tq.moveAssetsInOrder, 'to throw');
  });

  it('should visit assets in the correct order', async function() {
    const order = ['first.css', 'second.css', 'third.css', 'main.css'];
    let idx = 0;

    const assetGraph = new AssetGraph({
      root: 'testdata/transforms/moveAssetsInOrder/'
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();
    await assetGraph.moveAssetsInOrder({ type: 'Css' }, function(asset) {
      expect(asset.fileName, 'to be', order[idx]);
      idx += 1;
    });
  });

  it('should throw an error when encountering circular references', async function() {
    const assetGraph = new AssetGraph({
      root: 'testdata/transforms/moveAssetsInOrder/'
    });

    await assetGraph.loadAssets('circular.html');
    await assetGraph.populate();

    await expect(
      assetGraph.moveAssetsInOrder({ type: 'Css' }, '/css/'),
      'to error',
      /Couldn't find a suitable rename order due to cycles in the selection/
    );
  });
});
