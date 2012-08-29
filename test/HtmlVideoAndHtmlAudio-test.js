var vows = require('vows'),
    assert = require('assert'),
    _ = require('underscore'),
    AssetGraph = require('../lib/AssetGraph'),
    query = AssetGraph.query;

vows.describe('<video> and <audio> test').addBatch({
    'After loading test': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlVideoAndHtmlAudio/'})
                .loadAssets('index.html')
                .populate({
                    followRelations: function () {return false;}
                })
                .run(this.callback);
        },
        'the graph should contain 4 HtmlVideo relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlVideo'}, true).length, 4);
        },
        'the graph should contain 2 HtmlVideoPoster relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlVideoPoster'}, true).length, 2);
        },
        'the graph should contain 4 HtmlAudio relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlAudio'}, true).length, 4);
        },
        'then change the url of the main Html document and set the hrefType of the relations to "relative"': {
            topic: function (assetGraph) {
                assetGraph.findAssets({type: 'Html'})[0].url = 'http://example.com/foo/bar.html';
                assetGraph.findRelations({}, true).forEach(function (relation) {
                    relation.hrefType = 'relative';
                });
                return assetGraph;
            },
            'the relative urls of the relations should begin with ../': function (assetGraph) {
                assert.deepEqual(_.pluck(assetGraph.findRelations({}, true), 'href'),
                                 [
                                     '../movie1.mp4',
                                     '../movie1.jpg',
                                     '../movie2.png',
                                     '../movie2.mov',
                                     '../movie2.wmv',
                                     '../movie2.flc',
                                     '../sound.mp3',
                                     '../sound.wav',
                                     '../sound.wma',
                                     '../sound.flac'
                                 ]);
            }
        }
    }
})['export'](module);
