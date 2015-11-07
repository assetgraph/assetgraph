/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('assets/ApplicationManifest', function () {
    it('should detect .webmanifest extensions', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/assets/ApplicationManifest/'})
            .loadAssets('basic.webmanifest')
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'ApplicationManifest', 1);
            })
            .run(done);
    });

    it('should detect related_applications urls', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/assets/ApplicationManifest/'})
            .loadAssets('related_applications.webmanifest')
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations including unresolved', 'Relation', 2);
            })
            .run(done);
    });
});
