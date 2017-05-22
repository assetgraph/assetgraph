/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib/AssetGraph');

describe('relations/JavaScriptServiceWorkerRegistration', function () {
    it('should populate the relation', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptServiceWorkerRegistration'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'JavaScriptServiceWorkerRegistration', 1);
                expect(assetGraph, 'to contain assets', 'JavaScript', 2);
            })
            .run(done);
    });

    it('should read the href correctly', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptServiceWorkerRegistration'})
            .loadAssets('index.html')
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations including unresolved', 'JavaScriptServiceWorkerRegistration', 1);

                var relation = assetGraph.findRelations({ type: 'JavaScriptServiceWorkerRegistration' }, true)[0];

                expect(relation, 'to satisfy', {
                    href: 'sw.js'
                });
            })
            .run(done);
    });

    it('should write the href correctly', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptServiceWorkerRegistration'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'JavaScriptServiceWorkerRegistration', 1);

                var relation = assetGraph.findRelations({ type: 'JavaScriptServiceWorkerRegistration' }, true)[0];

                expect(relation, 'to satisfy', {
                    href: 'sw.js',
                    from: {
                        text: expect.it('not to contain', 'static/serviceworker.js')
                    }
                });

                relation.to.url = 'static/serviceworker.js';

                expect(relation, 'to satisfy', {
                    href: 'static/serviceworker.js',
                    from: {
                        text: expect.it('to contain', 'static/serviceworker.js')
                    }
                });
            })
            .run(done);
    });

    it('should throw when inlining', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptServiceWorkerRegistration'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                var relation = assetGraph.findRelations({ type: 'JavaScriptServiceWorkerRegistration' })[0];

                expect(relation.inline, 'to throw', 'JavaScriptServiceWorkerRegistration.inline(): Not allowed');
            })
            .run(done);
    });

    it('should throw when detaching', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptServiceWorkerRegistration'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                var relation = assetGraph.findRelations({ type: 'JavaScriptServiceWorkerRegistration' })[0];

                expect(relation.detach, 'to throw', 'JavaScriptServiceWorkerRegistration.detach(): Not implemented');
            })
            .run(done);
    });

    it('should throw when attaching', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptServiceWorkerRegistration'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                var relation = assetGraph.findRelations({ type: 'JavaScriptServiceWorkerRegistration' })[0];


                expect(function () {
                    relation.attach(relation.from, 'before', relation);
                }, 'to throw', 'JavaScriptServiceWorkerRegistration.attach(): Not implemented');
            })
            .run(done);
    });
});
