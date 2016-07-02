/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/JavaScriptFetch', function () {
    it('should not populate dynamic endpoints', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptFetch'})
            .loadAssets('dynamic.js')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'JavaScriptFetch', 0);
                expect(assetGraph, 'to contain assets', 'JavaScript', 1);
            })
            .run(done);
    });

    it('should populate naked fetch', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptFetch'})
            .loadAssets('fetch.js')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'JavaScriptFetch', 1);
                expect(assetGraph, 'to contain assets', 'JavaScript', 2);
            })
            .run(done);
    });

    it('should populate window.fetch', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptFetch'})
            .loadAssets('windowFetch.js')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'JavaScriptFetch', 1);
                expect(assetGraph, 'to contain assets', 'JavaScript', 2);
            })
            .run(done);
    });

    it('should populate this.fetch', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptFetch'})
            .loadAssets('thisFetch.js')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'JavaScriptFetch', 1);
                expect(assetGraph, 'to contain assets', 'JavaScript', 2);
            })
            .run(done);
    });

    it('should populate self.fetch', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptFetch'})
            .loadAssets('selfFetch.js')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'JavaScriptFetch', 1);
                expect(assetGraph, 'to contain assets', 'JavaScript', 2);
            })
            .run(done);
    });

    it('should populate a sequence fetch', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptFetch'})
            .loadAssets('selfFetch.js')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'JavaScriptFetch', 1);
                expect(assetGraph, 'to contain assets', 'JavaScript', 2);
            })
            .run(done);
    });

    it('should read the href correctly', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptFetch'})
            .loadAssets('fetch.js')
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
            .loadAssets('fetch.js')
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

    it('should inline as data-uri', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptFetch'})
            .loadAssets('fetch.js')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'JavaScriptFetch', 1);

                var relation = assetGraph.findRelations({ type: 'JavaScriptFetch' })[0];

                relation.inline();

                expect(relation.from, 'to satisfy', {
                    text: 'fetch(\'data:application/javascript,module.exports%20%3D%20\\\'fetched\\\'%3B%0A\');'
                });
            })
            .run(done);
    });

    it('should detach simple fetch statement correctly', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptFetch'})
            .loadAssets('a.js')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'JavaScriptFetch', 1);

                var relation = assetGraph.findRelations({ type: 'JavaScriptFetch' })[0];

                relation.detach();

                expect(relation.from, 'to satisfy', {
                    text: ''
                });
            })
            .run(done);
    });

    it('should detach fetch-then statement correctly', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptFetch'})
            .loadAssets('fetchThen.js')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'JavaScriptFetch', 1);

                var relation = assetGraph.findRelations({ type: 'JavaScriptFetch' })[0];

                relation.detach();

                expect(relation.from, 'to satisfy', {
                    text: ''
                });
            })
            .run(done);
    });

    it('should throw when attaching', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptFetch'})
            .loadAssets('a.js')
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
