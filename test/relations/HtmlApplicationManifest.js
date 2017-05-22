/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib/AssetGraph');

describe('relations/HtmlApplicationManifest', function () {
    it('should handle a test case with an existing <link rel="manifest">', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlApplicationManifest/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'HtmlApplicationManifest', 1);
                expect(assetGraph, 'to contain assets', 'ApplicationManifest', 1);
            })
            .run(done);
    });

    it('should read the link href correctly', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlApplicationManifest/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                var relation = assetGraph.findRelations({ type: 'HtmlApplicationManifest' })[0];

                expect(relation, 'to satisfy', {
                    href: 'manifest.json'
                });
            })
            .run(done);
    });

    it('should write the link href correctly', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlApplicationManifest/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                var relation = assetGraph.findRelations({ type: 'HtmlApplicationManifest' })[0];

                relation.to.url = 'foo.json';

                expect(relation, 'to satisfy', {
                    href: 'foo.json'
                });

                relation.href = 'bar.json';

                expect(relation, 'to satisfy', {
                    href: 'bar.json'
                });
            })
            .run(done);
    });

    it('should append <link rel="manifest"> to a containing document', function (done) {
        var relation = new AssetGraph.HtmlApplicationManifest({
            to: new AssetGraph.ApplicationManifest({
                url: 'attach.json',
                text: '{"name":"attach"}'
            })
        });

        new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlApplicationManifest/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                var html = assetGraph.findAssets({ type: 'Html' })[0];
                var adjacentRelation = assetGraph.findRelations({ type: 'HtmlApplicationManifest' })[0];

                relation.attach(html, 'before', adjacentRelation);

                expect(assetGraph, 'to contain relations', 'HtmlApplicationManifest', 2);
            })
            .run(done);
    });

    it('should warn when there are multiple application manifests linked from the same document', function (done) {
        var html = new AssetGraph.Html({
            text: '<html><head><link rel="manifest" href="manifest.json"><link rel="manifest" href="manifest.json"></head><body></body></html>'
        });

        var warns = [];

        new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlApplicationManifest/'})
            .on('warn', function (warning) {
                warns.push(warning);
            })
            .loadAssets(html)
            .populate()
            .queue(function (assetGraph) {
                expect(warns, 'to satisfy', [
                    {
                        message: /^Multiple ApplicationManifest relations/
                    }
                ]);
            })
            .run(done);
    });
});
