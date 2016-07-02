/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/JavaScriptFetch', function () {
    it('should populate the relation', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptFetch'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'JavaScriptFetch', 1);
                expect(assetGraph, 'to contain assets', 'JavaScript', 2);
            })
            .run(done);
    });

    it('should read the href correctly', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptFetch'})
            .loadAssets('index.html')
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations including unresolved', 'JavaScriptFetch', 1);

                var relation = assetGraph.findRelations({ type: 'JavaScriptFetch' }, true)[0];

                expect(relation, 'to satisfy', {
                    href: 'b.js'
                });
            })
            .run(done);
    });

    it('should write the href correctly', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptFetch'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'JavaScriptFetch', 1);

                var relation = assetGraph.findRelations({ type: 'JavaScriptFetch' }, true)[0];

                expect(relation, 'to satisfy', {
                    href: 'b.js',
                    from: {
                        text: expect.it('not to contain', 'static/b.js')
                    }
                });

                relation.to.url = 'static/b.js';

                expect(relation, 'to satisfy', {
                    href: 'static/b.js',
                    from: {
                        text: expect.it('to contain', 'static/b.js')
                    }
                });
            })
            .run(done);
    });

    it('should throw when inlining', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptFetch'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'JavaScriptFetch', 1);

                var relation = assetGraph.findRelations({ type: 'JavaScriptFetch' })[0];

                expect(relation.inline, 'to throw', 'JavaScriptFetch.inline(): Not allowed');
            })
            .run(done);
    });

    it('should throw when detaching', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptFetch'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'JavaScriptFetch', 1);

                var relation = assetGraph.findRelations({ type: 'JavaScriptFetch' })[0];

                expect(relation.detach, 'to throw', 'JavaScriptFetch.detach(): Not implemented');
            })
            .run(done);
    });

    it('should throw when attaching', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptFetch'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'JavaScriptFetch', 1);

                var relation = assetGraph.findRelations({ type: 'JavaScriptFetch' })[0];

                expect(function () {
                    relation.attach(relation.from, 'before', relation);
                }, 'to throw', 'JavaScriptFetch.attach(): Not implemented');
            })
            .run(done);
    });
});
