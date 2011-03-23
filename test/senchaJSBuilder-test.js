var URL = require('url'),
    vows = require('vows'),
    assert = require('assert'),
    step = require('step'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = require('../lib/transforms'),
    query = require('../lib/query');

vows.describe('resolvers.SenchaJSBuilder test').addBatch({
    'After loading a test case with three assets': {
        topic: function () {
            new AssetGraph({root: __dirname + '/senchaJSBuilder/'}).transform(
                transforms.registerLabelsAsCustomProtocols('mylabel=' + __dirname + '/senchaJSBuilder/foo.jsb2'),
                transforms.loadAssets('index.html'),
                transforms.populate(),
                transforms.flattenStaticIncludes({isInitial: true}),
                this.callback
            );
        },
        'the graph should contain one HTML asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'HTML'}).length, 1);
        },
        'the graph should contain one CSS asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'CSS', url: query.defined}).length, 1);
        },
        'the graph should contain one PNG asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'PNG'}).length, 1);
        },
        'the PNG should have 4 incoming CSSImage relations with the CSS as their base asset': function (assetGraph) {
            var cssAsset = assetGraph.findAssets({type: 'CSS'})[0],
                cssBackgroundImageRelations = assetGraph.findRelations({type: 'CSSImage', to: assetGraph.findAssets({type: 'PNG'})[0]});
            assert.equal(cssBackgroundImageRelations.length, 4);
            cssBackgroundImageRelations.forEach(function (cssBackgroundImageRelation) {
                assert.equal(assetGraph.getBaseAssetForRelation(cssBackgroundImageRelation), cssAsset);
            });
        },
        'then get the CSS as text': {
            topic: function (assetGraph) {
                assetGraph.getAssetText(assetGraph.findAssets({type: 'CSS'})[0], this.callback);
            },
            'the src should contain four occurrences of the corrected url': function (src) {
                var matches = src.match(/url\(\.\.\/\.\.\/images\/foo\/bar\/foo\.png\)/g);
                assert.equal(matches.length, 4);
            },
            'then inlining the CSS': {
                topic: function (_, assetGraph) {
                    assetGraph.transform(
                        transforms.inlineAssets({type: 'CSS'}),
                        this.callback
                    );
                },
                'all the background-image urls should be relative to the HTML': function (assetGraph) {
                    assetGraph.findRelations({type: 'CSSImage'}).forEach(function (relation) {
                        assert.equal(relation.cssRule.style[relation.propertyName], "url(resources/images/foo/bar/foo.png)");
                    });
                },
                'then get the HTML as text': {
                    topic: function (assetGraph) {
                        assetGraph.getAssetText(assetGraph.findAssets({type: 'HTML'})[0], this.callback);
                    },
                    'there should be four occurrences of the corrected background-image url': function (src) {
                        var matches = src.match(/url\(resources\/images\/foo\/bar\/foo\.png\)/g);
                        assert.equal(matches.length, 4);
                    }
                }
            }
        }
    }
})['export'](module);
