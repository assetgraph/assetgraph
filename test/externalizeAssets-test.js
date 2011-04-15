var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = require('../lib/transforms'),
    query = require('../lib/query');

vows.describe('Externalizing assets').addBatch({
    'After loading a test with multiple inline scripts then externalizing them': {
        topic: function () {
            new AssetGraph({root: __dirname + '/externalizeAssets/'}).transform(
                transforms.loadAssets('first.html', 'second.html'),
                transforms.populate(),
                transforms.externalizeAssets({type: 'JavaScript'}),
                this.callback
            );
        },
        'the graph should contain 3 JavaScript assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 3);
        },
        'first.html and second.html should each have a relation to the externalized "TypeThree" script': function (assetGraph) {
            var typeTwos = assetGraph.findAssets({type: 'JavaScript', decodedSrc: /TypeTwo/});
            assert.equal(typeTwos.length, 1);
            assert.equal(assetGraph.findRelations({from: {url: /first\.html$/}, to: typeTwos[0]}).length, 1);
            assert.equal(assetGraph.findRelations({from: {url: /second\.html$/}, to: typeTwos[0]}).length, 1);
        },
        'first.html and second.html should each have a relation to the externalized "TypeThree" script': function (assetGraph) {
            var typeThrees = assetGraph.findAssets({type: 'JavaScript', decodedSrc: /TypeThree/});
            assert.equal(typeThrees.length, 1);
            assert.equal(assetGraph.findRelations({from: {url: /first\.html$/}, to: typeThrees[0]}).length, 1);
            assert.equal(assetGraph.findRelations({from: {url: /second\.html$/}, to: typeThrees[0]}).length, 1);
        },
        'first.html should have two relations to the externalized "TypeOne" JavaScript': function (assetGraph) {
            assert.equal(assetGraph.findRelations({
                from: assetGraph.findAssets({url: /first\.html$/})[0],
                to: {
                    decodedSrc: /TypeOne/
                }
            }).length, 2);
        }

    }
})['export'](module);
