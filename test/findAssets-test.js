var URL = require('url'),
    vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = require('../lib/transforms'),
    assets = require('../lib/assets'),
    step = require('step');

vows.describe('AssetGraph.findAssets').addBatch({
    'Load test case': {
        topic: function () {
            new AssetGraph().transform(
                transforms.loadAssets(
                    {type: 'HTML', rawSrc: 'a', foo: 'bar'},
                    {type: 'HTML', rawSrc: 'b', foo: 'bar'},
                    {type: 'HTML', rawSrc: 'c', foo: 'quux'},
                    {type: 'CSS',  rawSrc: 'd', foo: 'baz'},
                    {type: 'CSS',  rawSrc: 'e'},
                    {type: 'PNG',  rawSrc: 'f', foo: 'baz'}
                ),
                this.callback
            );
        },
        'and lookup single value of unindexed property': function (assetGraph) {
            assert.equal(assetGraph.findAssets({foo: 'bar'}).length, 2);
        },
        'and lookup multiple values of unindexed property': function (assetGraph) {
            assert.equal(assetGraph.findAssets({foo: ['bar', 'quux']}).length, 3);
        },
        'and lookup single value of indexed property': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'HTML'}).length, 3);
            assert.equal(assetGraph.findAssets({type: 'CSS'}).length, 2);
            assert.equal(assetGraph.findAssets({type: 'PNG'}).length, 1);
        },
        'and lookup multiple values of indexed property': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: ['CSS', 'HTML']}).length, 5);
            assert.equal(assetGraph.findAssets({type: ['PNG', 'CSS', 'HTML']}).length, 6);
            assert.equal(assetGraph.findAssets({type: ['PNG', 'HTML']}).length, 4);
            assert.equal(assetGraph.findAssets({type: ['CSS', 'PNG']}).length, 3);
        },
        'and lookup multiple properties': function (assetGraph) {
            assert.equal(assetGraph.findAssets({foo: 'baz', type: 'CSS'}).length, 1);
            assert.equal(assetGraph.findAssets({foo: 'bar', type: 'HTML'}).length, 2);
            assert.equal(assetGraph.findAssets({foo: 'quux', type: 'PNG'}).length, 0);
        },
    }
})['export'](module);
