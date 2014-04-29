var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
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
            expect(assetGraph, 'to contain relations including unresolved', 'HtmlPictureSourceSrcSet', 3);
        },
        'the graph should contain 3 SrcSet asset': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'SrcSet', 3);
        },
        'the graph should contain 6 SrcSetEntry relations': function (assetGraph) {
            expect(assetGraph, 'to contain relations including unresolved', 'SrcSetEntry', 6);
        },
        'the graph should contain 6 Jpeg assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'Jpeg', 6);
        },
        'then change the file names of *-2.jpg': {
            topic: function (assetGraph) {
                assetGraph.findAssets({fileName: 'large-2.jpg'})[0].fileName = 'reallyLarge.jpg';
                assetGraph.findAssets({fileName: 'med-2.jpg'})[0].fileName = 'reallyMed.jpg';
                assetGraph.findAssets({fileName: 'small-2.jpg'})[0].fileName = 'reallySmall.jpg';
                return assetGraph;
            },
            'the outerHTML of the nodes with the srcset attributes should be updated': function (assetGraph) {
                expect(assetGraph.findRelations({type: 'HtmlPictureSourceSrcSet'}).map(function (htmlPictureSourceSrcSet) {
                    return htmlPictureSourceSrcSet.node.outerHTML;
                }), 'to equal', [
                    '<source media="(min-width: 45em)" srcset="large-1.jpg 1x, reallyLarge.jpg 2x">',
                    '<source media="(min-width: 18em)" srcset="med-1.jpg 1x, reallyMed.jpg 2x">',
                    '<source srcset="small-1.jpg 1x, reallySmall.jpg 2x">'
                ]);
            }
        }
    }
})['export'](module);
