/*global describe, it*/
var expect = require('./unexpected-with-plugins'),
    Path = require('path'),
    _ = require('lodash'),
    AssetGraph = require('../lib');

describe('AssetGraph#collectAssetsPostOrder()', function () {
    it('should visit some JavaScript assets in the correct order', function (done) {
        new AssetGraph({root: __dirname + '/../testdata/collectAssetsPostOrder/'})
            .loadAssets('index.js')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 6);
                var initialAsset = assetGraph.findAssets({url: /index\.js$/})[0];
                expect(
                    _.map(assetGraph.collectAssetsPostOrder(initialAsset, {type: 'JavaScriptInclude'}), 'url').map(function (url) {
                        return Path.basename(url);
                    }),
                    'to equal',
                    ['c.js', 'b.js', 'a.js', 'e.js', 'd.js', 'index.js']
                );
            })
            .run(done);
    });
});
