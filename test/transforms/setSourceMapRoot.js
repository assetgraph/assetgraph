/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib/AssetGraph');

describe('transforms/setSourceMapRoot', function () {
    it('should be able to modify source root', function (done) {
        new AssetGraph()
            .loadAssets(new AssetGraph.SourceMap({text: '{"sourceRoot":"rootFolder"}'}))
            .setSourceMapRoot(null, 'otherFolder')
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'SourceMap');
                expect(assetGraph.findAssets({type: 'SourceMap'})[0].parseTree.sourceRoot, 'to equal', 'otherFolder');
            })
            .run(done);
    });

    it('should be able to delete source root', function (done) {
        new AssetGraph()
            .loadAssets(new AssetGraph.SourceMap({text: '{"sourceRoot":"rootFolder"}'}))
            .setSourceMapRoot(null, null)
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'SourceMap');
                expect(assetGraph.findAssets({type: 'SourceMap'})[0].parseTree.sourceRoot, 'to equal', void 0);
            })
            .run(done);
    });

    describe('with a source map that has an existing sourceRoot', function () {
        it('should update relative references in sources', function () {
            return new AssetGraph({root: __dirname + '/../../testdata/transforms/setSourceMapRoot/existingSourceRoot/'})
                .loadAssets('index.html')
                .populate()
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain asset', {url: /\.less/, isLoaded: true});
                })
                .setSourceMapRoot(null, 'somewhereElse')
                .queue(function (assetGraph) {
                    expect(assetGraph.findAssets({type: 'SourceMap'})[0].parseTree, 'to satisfy', {
                        sources: ['../theSources/foo.less']
                    });
                });
        });

        it('should take the new sourceRoot into consideration when an asset is moved', function () {
            return new AssetGraph({root: __dirname + '/../../testdata/transforms/setSourceMapRoot/existingSourceRoot/'})
                .loadAssets('index.html')
                .populate()
                .setSourceMapRoot(null, 'somewhereElse')
                .queue(function (assetGraph) {
                    assetGraph.findAssets({url: /\.less$/})[0].url = assetGraph.root + 'somewhereElse/bar.less';
                    expect(assetGraph.findAssets({type: 'SourceMap'})[0].parseTree, 'to satisfy', {
                        sources: ['bar.less']
                    });
                });
        });

        it('should allow fixing up a wrong sourceRoot before continuing population', function () {
            return new AssetGraph({root: __dirname + '/../../testdata/transforms/setSourceMapRoot/wrongSourceRoot/'})
                .loadAssets('index.html')
                .populate({followRelations: {from: {type: AssetGraph.query.not('SourceMap')}}})
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain no assets', {url: /\.less$/, isLoaded: true});
                })
                .setSourceMapRoot(null, 'theSources')
                .populate({from: {type: 'SourceMap'}})
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain asset', {url: /\.less$/, isLoaded: true});
                })
                .queue(function (assetGraph) {
                    expect(assetGraph.findAssets({type: 'SourceMap'})[0].parseTree, 'to satisfy', {
                        sources: ['foo.less']
                    });
                });
        });
    });
});
