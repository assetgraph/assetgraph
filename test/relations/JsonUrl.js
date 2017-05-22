/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib/AssetGraph');

describe('relations/JsonUrl', function () {
    it('should get the href correctly', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JsonUrl/'})
            .loadAssets('app.webmanifest')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'HtmlApplicationManifest', 1);
                expect(assetGraph, 'to contain relations', 'JsonUrl', 1);

                expect(assetGraph.findRelations({ type: 'JsonUrl' }), 'to satisfy', [
                    {
                        href: 'index.html',
                        hrefType: 'relative'
                    }
                ]);
            })
            .run(done);
    });

    it('should set the href correctly', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JsonUrl/'})
            .loadAssets('app.webmanifest')
            .populate()
            .queue(function (assetGraph) {
                assetGraph.findAssets({ type: 'Html'})[0].fileName = 'foo.html';

                expect(assetGraph.findRelations({ type: 'JsonUrl' }), 'to satisfy', [
                    {
                        href: 'foo.html',
                        hrefType: 'relative'
                    }
                ]);
            })
            .run(done);
    });
});
