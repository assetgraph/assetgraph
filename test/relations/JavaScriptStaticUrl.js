const pathModule = require('path');
const expect = require('../unexpected-with-plugins');
const _ = require('lodash');
const AssetGraph = require('../../lib/AssetGraph');

describe('relations/JavaScriptStaticUrl', function () {
  it('should handle root relative urls', async function () {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/relations/JavaScriptStaticUrl/rootRelative/'
      ),
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    expect(
      _.map(assetGraph.findRelations({ type: 'JavaScriptStaticUrl' }), 'href'),
      'to equal',
      ['/images/foo.png']
    );
  });
});
