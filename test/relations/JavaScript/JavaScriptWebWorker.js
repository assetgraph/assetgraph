const pathModule = require('path');
const expect = require('../../unexpected-with-plugins');
const AssetGraph = require('../../../lib/AssetGraph');

describe('JavaScriptWebWorker', function () {
  it('should pick up new Worker(...) as a relation', async function () {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../../testdata/relations/JavaScript/JavaScriptWebWorker/simple/'
      ),
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    expect(assetGraph, 'to contain asset', { fileName: 'worker.js' });
  });

  it('should refuse to inline, attach and detach', async function () {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../../testdata/relations/JavaScript/JavaScriptWebWorker/simple/'
      ),
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    const javaScriptWebWorker = assetGraph.findRelations({
      type: 'JavaScriptWebWorker',
    })[0];
    expect(() => javaScriptWebWorker.inline(), 'to throw', /Not supported/);

    expect(() => javaScriptWebWorker.detach(), 'to throw', /Not supported/);

    expect(
      () => javaScriptWebWorker.attach('first'),
      'to throw',
      /Not supported/
    );
  });
});
