var vows = require('vows'),
    assert = require('assert'),
    _ = require('underscore'),
    AssetGraph = require('../lib'),
    query = AssetGraph.query;

vows.describe('HtmlPictureSourceSrcSet test').addBatch({
    'After loading test': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlPictureSourceSrcSet/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 3 HtmlPictureSourceSrcSet relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlPictureSourceSrcSet'}, true).length, 3);
        },
        'the graph should contain 3 SrcSet asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'SrcSet'}, true).length, 3);
        },
        'the graph should contain 6 SrcSetEntry relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'SrcSetEntry'}, true).length, 6);
        },
        'the graph should contain 6 Jpeg assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Jpeg'}, true).length, 6);
        },
        'then change the file names of *-2.jpg': {
            topic: function (assetGraph) {
                assetGraph.findAssets({fileName: 'large-2.jpg'})[0].fileName = 'reallyLarge.jpg';
                assetGraph.findAssets({fileName: 'med-2.jpg'})[0].fileName = 'reallyMed.jpg';
                assetGraph.findAssets({fileName: 'small-2.jpg'})[0].fileName = 'reallySmall.jpg';
                return assetGraph;
            },
            'the outerHTML of the nodes with the srcset attributes should be updated': function (assetGraph) {
                assert.deepEqual(assetGraph.findRelations({type: 'HtmlPictureSourceSrcSet'}).map(function (htmlPictureSourceSrcSet) {
                    return htmlPictureSourceSrcSet.node.outerHTML;
                }), [
                    '<source media="(min-width: 45em)" srcset="large-1.jpg 1x, reallyLarge.jpg 2x"></source>',
                    '<source media="(min-width: 18em)" srcset="med-1.jpg 1x, reallyMed.jpg 2x"></source>',
                    '<source srcset="small-1.jpg 1x, reallySmall.jpg 2x"></source>'
                ]);
            }
        }
    }
})['export'](module);
