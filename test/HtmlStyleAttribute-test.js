var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib');

vows.describe('HtmlStyleAttribute test').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlStyleAttribute/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 4 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 4);
        },
        'the graph should contain 1 Html asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html'}).length, 1);
        },
        'the graph should contain 2 HtmlStyleAttribute relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlStyleAttribute'}).length, 2);
        },
        'the graph should contain 1 CssImage relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'CssImage'}).length, 1);
        },
        'the graph should contain 1 Png asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Png'}).length, 1);
        },
        'then inlining the image': {
            topic: function (assetGraph) {
                assetGraph.inlineRelations({type: 'CssImage'}).run(this.callback);
            },
            'the text of the Html asset should contain a data: url': function (assetGraph) {
                assert.matches(assetGraph.findAssets({type: 'Html'})[0].text,
                               /data:/);
            },
            'then add a property to the first Css and mark it dirty': {
                topic: function (assetGraph) {
                    var cssAsset = assetGraph.findAssets({type: 'Css'})[0];
                    cssAsset.parseTree.cssRules[0].style.setProperty('line-height', '200%');
                    cssAsset.markDirty();
                    return assetGraph;
                },
                'the new property should be in the text of the Html asset': function (assetGraph) {
                    assert.matches(assetGraph.findAssets({type: 'Html'})[0].text,
                                   /line-height:/);
                }
            },
            'then add a property to the second Css and mark it dirty': {
                topic: function (assetGraph) {
                    var cssAsset = assetGraph.findAssets({type: 'Css'})[1];
                    cssAsset.parseTree.cssRules[0].style.setProperty('line-height', '200%');
                    cssAsset.markDirty();
                    return assetGraph;
                },
                'the Html should still contain both "foo" declarations': function (assetGraph) {
                    assert.matches(assetGraph.findAssets({type: 'Html'})[0].text, /foo:\s*bar;.*foo:\s*quux/);
                }
            }
        }
    }
})['export'](module);
