var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib');

vows.describe('HtmlStyleAttribute test').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlStyleAttribute/'})
                .loadAssets('index.html')
                .populate()
                .run(done);
        },
        'the graph should contain 4 assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 4);
        },
        'the graph should contain 1 Html asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Html');
        },
        'the graph should contain 2 HtmlStyleAttribute relation': function (assetGraph) {
            expect(assetGraph, 'to contain relations', 'HtmlStyleAttribute', 2);
        },
        'the graph should contain 1 CssImage relation': function (assetGraph) {
            expect(assetGraph, 'to contain relation', 'CssImage');
        },
        'the graph should contain 1 Png asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Png');
        },
        'then inlining the image': {
            topic: function (assetGraph) {
                assetGraph.inlineRelations({type: 'CssImage'}).run(done);
            },
            'the text of the Html asset should contain a data: url': function (assetGraph) {
                expect(assetGraph.findAssets({type: 'Html'})[0].text, 'to match',
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
                    expect(assetGraph.findAssets({type: 'Html'})[0].text, 'to match',
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
                    expect(assetGraph.findAssets({type: 'Html'})[0].text, 'to match', /foo:\s*bar;.*foo:\s*quux/);
                }
            }
        }
    }
})['export'](module);
