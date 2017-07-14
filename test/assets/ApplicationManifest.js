/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib/AssetGraph');

describe('assets/ApplicationManifest', function () {
    it('should detect .webmanifest extensions', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/assets/ApplicationManifest/'})
            .loadAssets('basic.webmanifest')
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'ApplicationManifest', 1);
            });
    });

    it('should detect related_applications urls', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/assets/ApplicationManifest/'})
            .loadAssets('related_applications.webmanifest')
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations including unresolved', 'JsonUrl', 2);
            });
    });

    it('should detect splash_screens urls', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/assets/ApplicationManifest/'})
            .loadAssets('splash_screens.webmanifest')
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations including unresolved', 'JsonUrl', 2);
            })
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'JsonUrl', 2);
                expect(assetGraph, 'to contain assets', 'Png', 1);
                expect(assetGraph, 'to contain assets', 'Jpeg', 1);
            });
    });

    it('should detect icons urls', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/assets/ApplicationManifest/'})
            .loadAssets('icons.webmanifest')
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations including unresolved', 'JsonUrl', 2);
            })
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'JsonUrl', 2);
                expect(assetGraph, 'to contain asset', { url: /\.png/ });
                expect(assetGraph, 'to contain asset', { url: /\.jpg/ });
            });
    });

    it('should detect start_url urls', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/assets/ApplicationManifest/'})
            .loadAssets('start_url.webmanifest')
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations including unresolved', 'JsonUrl', 1);
                expect(assetGraph, 'to contain assets', 'Html', 0);
            })
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'JsonUrl', 1);
                expect(assetGraph, 'to contain assets', { url: /\.html$/ }, 1);
            });
    });
});
