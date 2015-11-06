/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('assets/ApplicationManifest', function () {
    it('should detect .webmanifest extensions', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/assets/ApplicationManifest/'})
            .loadAssets('basic.webmanifest')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'ApplicationManifest', 1);
            })
            .run(done);
    });
});
