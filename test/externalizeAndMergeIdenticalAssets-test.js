var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib'),
    query = AssetGraph.query;

vows.describe('Externalizing and merging identical assets').addBatch({
    'After loading a test with multiple inline scripts then externalizing them': {
        topic: function () {
            new AssetGraph({root: __dirname + '/externalizeAndMergeIdenticalAssets/'})
                .loadAssets('first.html', 'second.html')
                .populate()
                .externalizeRelations({type: 'HtmlScript'})
                .run(this.callback);
        },
        'the graph should contain 7 non-inline JavaScript assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', {type: 'JavaScript', isInline: false}, 7);
        },
        'then run the mergeIdenticalAssets transform': {
            topic: function (assetGraph) {
                assetGraph.mergeIdenticalAssets({type: 'JavaScript'}).run(this.callback);
            },
            'the graph should contain 3 JavaScript assets': function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 3);
            },
            'first.html and second.html should each have a relation to the externalized "TypeThree" script': function (assetGraph) {
                var typeTwos = assetGraph.findAssets({type: 'JavaScript', text: /TypeTwo/});
                expect(typeTwos, 'to have length', 1);
                expect(assetGraph, 'to contain relation', {from: {url: /first\.html$/}, to: typeTwos[0]});
                expect(assetGraph, 'to contain relation', {from: {url: /second\.html$/}, to: typeTwos[0]});
            },
            'first.html and second.html should each have a relation to the externalized "TypeThree" script': function (assetGraph) {
                var typeThrees = assetGraph.findAssets({type: 'JavaScript', text: /TypeThree/});
                expect(typeThrees, 'to have length', 1);
                expect(assetGraph, 'to contain relation', {from: {url: /first\.html$/}, to: typeThrees[0]});
                expect(assetGraph, 'to contain relation', {from: {url: /second\.html$/}, to: typeThrees[0]});
            },
            'first.html should have two relations to the externalized "TypeOne" JavaScript': function (assetGraph) {
                expect(assetGraph, 'to contain relations', {
                    from: assetGraph.findAssets({url: /first\.html$/})[0],
                    to: {
                        text: /TypeOne/
                    }
                }, 2);
            }
        }
    }
})['export'](module);
