/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib/AssetGraph');


describe('transforms/addRelNoopenerToBlankTargetAnchors', function () {
    it('should add rel="noopener" attribute to relevant anchors', function () {
        return new AssetGraph({ root: __dirname + '/../../testdata/transforms/addRelNoopenerToBlankTargetAnchors/' })
            .loadAssets('index.html')
            .queue(function (assetGraph) {
                var anchorRels = assetGraph.findRelations({}, true).map(function (relation) {
                    return relation.node.getAttribute('rel');
                });

                expect(anchorRels, 'to satisfy', [
                    null,
                    null,
                    'nofollow',
                    'noopener',
                    null,
                    null,
                    'nofollow',
                    'noopener',
                    'opener'
                ]);
            })
            .addRelNoopenerToBlankTargetAnchors()
            .queue(function (assetGraph) {
                var anchorRels = assetGraph.findRelations({}, true).map(function (relation) {
                    return relation.node.getAttribute('rel');
                });

                expect(anchorRels, 'to satisfy', [
                    null,
                    null,
                    'nofollow',
                    'noopener',
                    null,
                    'noopener',
                    'nofollow noopener',
                    'noopener',
                    'opener'
                ]);
            });
    });
});
