var vows = require('vows'),
    assert = require('assert'),
    _ = require('underscore'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = AssetGraph.transforms,
    query = AssetGraph.query;

function getTargetFileNames(relations) {
    return _.pluck(_.pluck(relations, 'to'), 'url').map(function (url) {
        return url.replace(/^.*\//, '');
    });
}

vows.describe('AssetGraph.updateRelationTarget').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/updateRelationTarget/'}).queue(
                transforms.loadAssets('index.html', 'd.js'),
                transforms.populate()
            ).run(this.callback);
        },
        'the graph should contain 4 JavaScript assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 4);
        },
        'the relations should be in the correct global order': function (assetGraph) {
            assert.deepEqual(getTargetFileNames(assetGraph.findRelations()),
                             ['a.js', 'b.js', 'c.js']);
        },
        'the relations should be in the correct order in the "type" index': function (assetGraph) {
            assert.deepEqual(getTargetFileNames(assetGraph.findRelations({type: 'HtmlScript'})),
                             ['a.js', 'b.js', 'c.js']);
        },
        'the relations from the Html asset should be in the correct order': function (assetGraph) {
            var htmlAsset = assetGraph.findAssets({type: 'Html'})[0];
            assert.deepEqual(getTargetFileNames(assetGraph.findRelations({from: htmlAsset, type: 'HtmlScript'})),
                             ['a.js', 'b.js', 'c.js']);
        },
        'then update the target of the relation pointing at b.js': {
            topic: function (assetGraph) {
                assetGraph.updateRelationTarget(assetGraph.findRelations({to: {url: /\/b\.js$/}})[0],
                                                assetGraph.findAssets({url: /\/d\.js$/})[0]);
                return assetGraph;
            },
            'the relations should be in the correct global order': function (assetGraph) {
                assert.deepEqual(getTargetFileNames(assetGraph.findRelations()),
                                 ['a.js', 'd.js', 'c.js']);
            },
            'the relations should be in the correct order in the "type" index': function (assetGraph) {
                assert.deepEqual(getTargetFileNames(assetGraph.findRelations({type: 'HtmlScript'})),
                                 ['a.js', 'd.js', 'c.js']);
            },
            'the relations from the Html asset should be in the correct order': function (assetGraph) {
                var htmlAsset = assetGraph.findAssets({type: 'Html'})[0];
                assert.deepEqual(getTargetFileNames(assetGraph.findRelations({from: htmlAsset, type: 'HtmlScript'})),
                                 ['a.js', 'd.js', 'c.js']);
            }
        }
    }
})['export'](module);
