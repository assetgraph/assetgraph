var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    _ = require('underscore'),
    AssetGraph = require('../lib'),
    query = AssetGraph.query;

function getTargetFileNames(relations) {
    return _.pluck(_.pluck(relations, 'to'), 'url').map(function (url) {
        return url.replace(/^.*\//, '');
    });
}

vows.describe('relation.updateTarget').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/updateRelationTarget/'})
                .loadAssets('index.html', 'd.js')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 4 JavaScript assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'JavaScript', 4);
        },
        'the relations should be in the correct global order': function (assetGraph) {
            expect(getTargetFileNames(assetGraph.findRelations()), 'to equal',
                             ['a.js', 'b.js', 'c.js']);
        },
        'the relations should be in the correct order in the "type" index': function (assetGraph) {
            expect(getTargetFileNames(assetGraph.findRelations({type: 'HtmlScript'})), 'to equal',
                             ['a.js', 'b.js', 'c.js']);
        },
        'the relations from the Html asset should be in the correct order': function (assetGraph) {
            var htmlAsset = assetGraph.findAssets({type: 'Html'})[0];
            expect(getTargetFileNames(assetGraph.findRelations({from: htmlAsset, type: 'HtmlScript'})), 'to equal',
                             ['a.js', 'b.js', 'c.js']);
        },
        'then update the target of the relation pointing at b.js': {
            topic: function (assetGraph) {
                var relation = assetGraph.findRelations({to: {url: /\/b\.js$/}})[0];
                relation.to = assetGraph.findAssets({url: /\/d\.js$/})[0];
                relation.refreshHref();
                return assetGraph;
            },
            'the relations should be in the correct global order': function (assetGraph) {
                expect(getTargetFileNames(assetGraph.findRelations()), 'to equal',
                                 ['a.js', 'd.js', 'c.js']);
            },
            'the relations should be in the correct order in the "type" index': function (assetGraph) {
                expect(getTargetFileNames(assetGraph.findRelations({type: 'HtmlScript'})), 'to equal',
                                 ['a.js', 'd.js', 'c.js']);
            },
            'the relations from the Html asset should be in the correct order': function (assetGraph) {
                var htmlAsset = assetGraph.findAssets({type: 'Html'})[0];
                expect(getTargetFileNames(assetGraph.findRelations({from: htmlAsset, type: 'HtmlScript'})), 'to equal',
                                 ['a.js', 'd.js', 'c.js']);
            }
        }
    }
})['export'](module);
