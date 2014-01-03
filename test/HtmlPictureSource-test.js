var vows = require('vows'),
    assert = require('assert'),
    _ = require('underscore'),
    AssetGraph = require('../lib'),
    query = AssetGraph.query;

vows.describe('HtmlPictureSource test').addBatch({
    'After loading test': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlPictureSource/'})
                .loadAssets('index.html')
                .populate({
                    followRelations: function () {return false;}
                })
                .run(this.callback);
        },
        'the graph should contain 2 HtmlPictureSource relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlPictureSource'}, true).length, 2);
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
                                     '../image.png',
                                     '../otherImage.jpg'
                                 ]);
            }
        }
    }
})['export'](module);
