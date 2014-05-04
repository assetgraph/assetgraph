var expect = require('./unexpected-with-plugins'),
    _ = require('underscore'),
    AssetGraph = require('../lib'),
    query = AssetGraph.query;

describe('HtmlAudio', function () {
    it('should handle a test case with existing <audio> tags', function (done) {
        new AssetGraph({root: __dirname + '/HtmlAudio/'})
            .loadAssets('index.html')
            .populate({
                followRelations: function () {return false;}
            })
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations including unresolved', 'HtmlAudio', 4);

                assetGraph.findAssets({type: 'Html'})[0].url = 'http://example.com/foo/bar.html';
                assetGraph.findRelations({}, true).forEach(function (relation) {
                    relation.hrefType = 'relative';
                });

                expect(_.pluck(assetGraph.findRelations({}, true), 'href'), 'to equal', [
                    '../sound.mp3',
                    '../sound.wav',
                    '../sound.wma',
                    '../sound.flac'
                ]);
            })
            .run(done);
    });
});
