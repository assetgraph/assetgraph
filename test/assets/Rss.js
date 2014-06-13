/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('assets/Rss', function () {
    it('should find an Rss asset', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/assets/Rss/'})
          .loadAssets('feed.rss')
          .populate()
          .queue(function (assetGraph) {
              expect(assetGraph, 'to contain asset', 'Rss');
              expect(assetGraph, 'to contain asset', 'Png');
              expect(assetGraph, 'to contain assets', {type: 'Html', isInline: true}, 2);
              expect(assetGraph, 'to contain assets', {type: 'Html', isInline: false}, 1);
              expect(assetGraph, 'to contain relation', 'RssChannelLink');

              assetGraph.findAssets({fileName: 'bar.html'})[0].url = 'http://example.com/bar.html';
              assetGraph.findRelations({type: 'RssChannelLink'})[0].hrefType = 'absolute';

              expect(assetGraph, 'to contain asset', {type: 'Rss', text: /<link>http:\/\/example.com\/bar.html<\/link>/});
          })
          .run(done);
    });
});
