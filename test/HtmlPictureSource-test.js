var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
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
                .run(done);
        },
        'the graph should contain 2 HtmlPictureSource relations': function (assetGraph) {
            expect(assetGraph, 'to contain relations including unresolved', 'HtmlPictureSource', 2);
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
                expect(_.pluck(assetGraph.findRelations({}, true), 'href'), 'to equal',
                                 [
                                     '../image.png',
                                     '../otherImage.jpg'
                                 ]);
            }
        }
    }
})['export'](module);
