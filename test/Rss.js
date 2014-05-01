var expect = require('./unexpected-with-plugins'),
    _ = require('underscore'),
    AssetGraph = require('../lib');

describe('Rss', function () {
    it('should find an Rss asset', function (done) {
        new AssetGraph({root: __dirname + '/Rss/'})
          .loadAssets('feed.rss')
          .populate()
          .queue(function (assetGraph) {
              expect(assetGraph, 'to contain assets', 'Rss', 1);
              expect(assetGraph, 'to contain assets', 'Html', 2);
          })
          .run(done);
    });
});
