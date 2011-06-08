var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = AssetGraph.transforms,
    query = AssetGraph.query;

vows.describe('<video> and <audio> test').addBatch({
    'After loading test': {
        topic: function () {
            new AssetGraph({root: __dirname + '/htmlVideoAndAudio/'}).queue(
                transforms.loadAssets('index.html'),
                transforms.populate({
                    followRelations: function () {return false;}
                })
            ).run(this.callback);
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
        'then change the url of the main Html document': {
            topic: function (assetGraph) {
                assetGraph.setAssetUrl(assetGraph.findAssets({type: 'Html'})[0], 'http://example.com/foo/bar.html');
                return assetGraph;
            },
            'the relative urls of the relations should begin with ../': function (assetGraph) {
                assert.deepEqual(assetGraph.findRelations({}, true).map(function (relation) {return relation._getRawUrlString();}),
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
