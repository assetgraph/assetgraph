const expect = require('../unexpected-with-plugins');
const sinon = require('sinon');
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

  it('should emit an error when encountering circular references', async function() {
    const order = ['first.css', 'second.css', 'third.css', 'main.css'];
    let idx = 0;

    const assetGraph = new AssetGraph({
      root: 'testdata/transforms/moveAssetsInOrder/'
    });

    const spy = sinon.spy();
    assetGraph.on('warn', spy);

    await assetGraph.loadAssets('partiallycircular.html');
    await assetGraph.populate();
    await assetGraph.moveAssetsInOrder({ type: 'Css' }, function(asset) {
      expect(asset.fileName, 'to be', order[idx]);
      idx += 1;
    });

    expect(spy, 'to have calls satisfying', () => {
      spy({
        message:
          'transforms.moveAssetsInOrder: Cyclic dependencies detected. All files could not be moved',
        relations: expect.it('with set semantics', 'to satisfy', [
          {
            from: {
              fileName: 'circular-base.css'
            },
            href: 'circular-child.css'
          },
          {
            from: {
              fileName: 'circular-child.css'
            },
            href: 'circular-base.css'
          }
        ])
      });
    });
  });
});
