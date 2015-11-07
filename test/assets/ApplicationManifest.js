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

    it('should detect splash_screens urls', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/assets/ApplicationManifest/'})
            .loadAssets('splash_screens.webmanifest')
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations including unresolved', 'Relation', 2);
            })
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'Relation', 2);
                expect(assetGraph, 'to contain assets', 'Png', 1);
                expect(assetGraph, 'to contain assets', 'Jpeg', 1);
            })
            .run(done);
    });

    it('should detect icons urls', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/assets/ApplicationManifest/'})
            .loadAssets('icons.webmanifest')
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations including unresolved', 'Relation', 2);
            })
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'Relation', 2);
                expect(assetGraph, 'to contain assets', 'Png', 1);
                expect(assetGraph, 'to contain assets', 'Jpeg', 1);
            })
            .run(done);
    });

    it('should detect start_url urls', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/assets/ApplicationManifest/'})
            .loadAssets('start_url.webmanifest')
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations including unresolved', 'Relation', 1);
                expect(assetGraph, 'to contain assets', 'Html', 0);
            })
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'Relation', 1);
                expect(assetGraph, 'to contain assets', 'Html', 1);
            })
            .run(done);
    });
});
