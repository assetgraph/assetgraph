/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const _ = require('lodash');
const AssetGraph = require('../../lib/AssetGraph');

describe('relations/HtmlAudio', function () {
    it('should handle a test case with existing <audio> tags', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlAudio/'})
            .loadAssets('index.html')
            .populate({
                startAssets: { type: 'Html' },
                followRelations: () => false
            })
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'HtmlAudio', 4);

                assetGraph.findAssets({type: 'Html'})[0].url = 'http://example.com/foo/bar.html';
                assetGraph.findRelations({}, true).forEach(function (relation) {
                    relation.hrefType = 'relative';
                });

                expect(_.map(assetGraph.findRelations({}, true), 'href'), 'to equal', [
                    '../sound.mp3',
                    '../sound.wav',
                    '../sound.wma',
                    '../sound.flac'
                ]);
            })
            .run(done);
    });
});
