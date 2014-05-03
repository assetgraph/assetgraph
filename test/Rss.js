var expect = require('./unexpected-with-plugins'),
    _ = require('underscore'),
    AssetGraph = require('../lib');

describe('Rss', function () {
    it('should find an Rss asset', function (done) {
        new AssetGraph({root: __dirname + '/Rss/'})
          .loadAssets('feed.rss')
          .populate()
          .queue(function (assetGraph) {
              expect(assetGraph, 'to contain asset', 'Rss');
              expect(assetGraph, 'to contain asset', 'Png');
              expect(assetGraph, 'to contain assets', {type: 'Html', isInline: true}, 2);
              expect(assetGraph, 'to contain assets', {type: 'Html', isInline: false}, 1);
          })
          .run(done);
    });
});
