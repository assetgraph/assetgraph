/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('transforms/externalizeRelations and transforms/mergeIdenticalAssets', function () {
    it('should handle a test case with multiple inline scripts then externalizing them', async function () {
        const assetGraph = new AssetGraph({root: __dirname + '/../../testdata/transforms/externalizeAndMergeIdenticalAssets/'});
        await assetGraph.loadAssets('first.html', 'second.html');
        await assetGraph.populate();
        await assetGraph.externalizeRelations({type: 'HtmlScript'});

        expect(assetGraph, 'to contain assets', {type: 'JavaScript', isInline: false}, 7);

        await assetGraph.mergeIdenticalAssets({type: 'JavaScript'});

        expect(assetGraph, 'to contain assets', 'JavaScript', 3);

        const typeTwos = assetGraph.findAssets({type: 'JavaScript', text: {$regex: /TypeTwo/}});
        expect(typeTwos, 'to have length', 1);
        expect(assetGraph, 'to contain relation', {from: {fileName: 'first.html'}, to: typeTwos[0]});
        expect(assetGraph, 'to contain relation', {from: {fileName: 'second.html'}, to: typeTwos[0]});

        const typeThrees = assetGraph.findAssets({type: 'JavaScript', text: {$regex: /TypeThree/}});
        expect(typeThrees, 'to have length', 1);
        expect(assetGraph, 'to contain relation', {from: {fileName: 'first.html'}, to: typeThrees[0]});
        expect(assetGraph, 'to contain relation', {from: {fileName: 'second.html'}, to: typeThrees[0]});

        expect(assetGraph, 'to contain relations', {
            from: assetGraph.findAssets({fileName: 'first.html'})[0],
            to: {
                text: {$regex: /TypeOne/}
            }
        }, 2);
    });
});
