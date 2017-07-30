/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('transforms/setSourceMapRoot', function () {
    it('should be able to modify source root', async function () {
        const assetGraph = await new AssetGraph()
            .loadAssets(new AssetGraph.SourceMap({text: '{"sourceRoot":"rootFolder"}'}))
            .setSourceMapRoot(null, 'otherFolder');

        expect(assetGraph, 'to contain asset', 'SourceMap');
        expect(assetGraph.findAssets({type: 'SourceMap'})[0].parseTree.sourceRoot, 'to equal', 'otherFolder');
    });

    it('should be able to delete source root', async function () {
        const assetGraph = await new AssetGraph()
            .loadAssets(new AssetGraph.SourceMap({text: '{"sourceRoot":"rootFolder"}'}))
            .setSourceMapRoot(null, null);

        expect(assetGraph, 'to contain asset', 'SourceMap');
        expect(assetGraph.findAssets({type: 'SourceMap'})[0].parseTree.sourceRoot, 'to equal', void 0);
    });

    describe('with a source map that has an existing sourceRoot', function () {
        it('should update relative references in sources', async function () {
            const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/setSourceMapRoot/existingSourceRoot/'})
                .loadAssets('index.html')
                .populate();

            expect(assetGraph, 'to contain asset', {url: /\.less$/, isLoaded: true});

            await assetGraph.setSourceMapRoot(null, 'somewhereElse');

            expect(assetGraph.findAssets({type: 'SourceMap'})[0].parseTree, 'to satisfy', {
                sources: ['../theSources/foo.less']
            });
        });

        it('should take the new sourceRoot into consideration when an asset is moved', async function () {
            const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/setSourceMapRoot/existingSourceRoot/'})
                .loadAssets('index.html')
                .populate()
                .setSourceMapRoot(null, 'somewhereElse');

            assetGraph.findAssets({url: /\.less$/})[0].url = assetGraph.root + 'somewhereElse/bar.less';
            expect(assetGraph.findAssets({type: 'SourceMap'})[0].parseTree, 'to satisfy', {
                sources: ['bar.less']
            });
        });

        it('should allow fixing up a wrong sourceRoot before continuing population', async function () {
            const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/setSourceMapRoot/wrongSourceRoot/'})
                .loadAssets('index.html')
                .populate({followRelations: {from: {type: AssetGraph.query.not('SourceMap')}}});

            expect(assetGraph, 'to contain no assets', {url: /\.less$/});

            await assetGraph.setSourceMapRoot(null, 'theSources')
                .populate({from: {type: 'SourceMap'}});

            expect(assetGraph, 'to contain asset', {url: /\.less$/, isLoaded: true});
            expect(assetGraph.findAssets({type: 'SourceMap'})[0].parseTree, 'to satisfy', {
                sources: ['foo.less']
            });
        });
    });
});
