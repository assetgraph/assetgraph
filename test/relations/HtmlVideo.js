var expect = require('../unexpected-with-plugins'),
    _ = require('underscore'),
    AssetGraph = require('../../lib'),
    query = AssetGraph.query;

describe('relations/HtmlVideo', function () {
    it('should handle a test case with existing <video> tags', function (done) {
        new AssetGraph({root: __dirname + '/HtmlVideo/'})
            .loadAssets('index.html')
            .populate({
                followRelations: function () {return false;}
            })
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations including unresolved', 'HtmlVideo', 4);
                expect(assetGraph, 'to contain relations including unresolved', 'HtmlVideoPoster', 2);

                assetGraph.findAssets({type: 'Html'})[0].url = 'http://example.com/foo/bar.html';
                assetGraph.findRelations({}, true).forEach(function (relation) {
                    relation.hrefType = 'relative';
                });

                expect(_.pluck(assetGraph.findRelations({}, true), 'href'), 'to equal', [
                    '../movie1.mp4',
                    '../movie1.jpg',
                    '../movie2.png',
                    '../movie2.mov',
                    '../movie2.wmv',
                    '../movie2.flc'
                ]);
            })
            .run(done);
    });
});
