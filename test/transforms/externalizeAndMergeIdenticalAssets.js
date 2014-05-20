var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib'),
    query = AssetGraph.query;

describe('transforms/externalizeRelations and transforms/mergeIdenticalAssets', function () {
    it('should handle a test case with multiple inline scripts then externalizing them', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/externalizeAndMergeIdenticalAssets/'})
            .loadAssets('first.html', 'second.html')
            .populate()
            .externalizeRelations({type: 'HtmlScript'})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', {type: 'JavaScript', isInline: false}, 7);
            })
            .mergeIdenticalAssets({type: 'JavaScript'})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 3);

                var typeTwos = assetGraph.findAssets({type: 'JavaScript', text: /TypeTwo/});
                expect(typeTwos, 'to have length', 1);
                expect(assetGraph, 'to contain relation', {from: {url: /first\.html$/}, to: typeTwos[0]});
                expect(assetGraph, 'to contain relation', {from: {url: /second\.html$/}, to: typeTwos[0]});

                var typeThrees = assetGraph.findAssets({type: 'JavaScript', text: /TypeThree/});
                expect(typeThrees, 'to have length', 1);
                expect(assetGraph, 'to contain relation', {from: {url: /first\.html$/}, to: typeThrees[0]});
                expect(assetGraph, 'to contain relation', {from: {url: /second\.html$/}, to: typeThrees[0]});

                expect(assetGraph, 'to contain relations', {
                    from: assetGraph.findAssets({url: /first\.html$/})[0],
                    to: {
                        text: /TypeOne/
                    }
                }, 2);
            })
            .run(done);
    });
});
