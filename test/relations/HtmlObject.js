const pathModule = require('path');
const _ = require('lodash');
const expect = require('../unexpected-with-plugins');
const urlTools = require('urltools');
const AssetGraph = require('../../lib/AssetGraph');

describe('relations/HtmlObject', function() {
  it('should handle a test case with an existing <object><param name="src" value="..."></object> construct', async function() {
    const assetGraph = new AssetGraph({
      root: pathModule.resolve(
        __dirname,
        '../../testdata/relations/HtmlObject/'
      )
    });
    await assetGraph.loadAssets('index.html');
    await assetGraph.populate();

    expect(assetGraph, 'to contain relations', 'HtmlObject', 3);
    expect(assetGraph, 'to contain assets', 'Flash', 3);
    expect(
      _.map(assetGraph.findRelations({ type: 'HtmlObject' }), 'href'),
      'to equal',
      ['themovie.swf', 'theothermovie.swf', 'yetanothermovie.swf']
    );

    assetGraph.findAssets({ type: 'Html' })[0].url = urlTools.resolveUrl(
      assetGraph.root,
      'foo/index.html'
    );
    expect(
      _.map(assetGraph.findRelations({ type: 'HtmlObject' }), 'href'),
      'to equal',
      ['../themovie.swf', '../theothermovie.swf', '../yetanothermovie.swf']
    );
  });
});
