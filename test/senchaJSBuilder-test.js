var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = require('../lib/transforms'),
    query = require('../lib/query');

vows.describe('resolvers.SenchaJSBuilder test').addBatch({
    'After loading a test case with three assets': {
        topic: function () {
            new AssetGraph({root: __dirname + '/senchaJSBuilder/rewriteBackgroundImageUrls/'}).transform(
                transforms.registerLabelsAsCustomProtocols('mylabel=' + __dirname + '/senchaJSBuilder/rewriteBackgroundImageUrls/foo.jsb2'),
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
            'then inlining the HTMLStyle relations': {
                topic: function (_, assetGraph) {
                    assetGraph.transform(
                        transforms.inlineRelations({type: 'HTMLStyle'}),
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
    },
    'After loading a test case with an HTML asset and a jsb2 describing packages that depend on each other': {
        topic: function () {
            new AssetGraph({root: __dirname + '/senchaJSBuilder/dependentPackages/'}).transform(
                transforms.registerLabelsAsCustomProtocols('mylabel=' + __dirname + '/senchaJSBuilder/dependentPackages/foo.jsb2'),
                transforms.loadAssets('index.html'),
                transforms.populate(),
                this.callback
            );
        },
        'the graph should contain a single HTML asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'HTML'}).length, 1);
        },
        'the graph should contain a single inline JavaScript asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript', url: query.undefined}).length, 1);
        },
        'the graph should contain 3 JavaScriptStaticInclude relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'JavaScriptStaticInclude'}).length, 3);
        },
        'then get the inline JavaScript as text': {
            topic: function (assetGraph) {
                assetGraph.getAssetText(assetGraph.findAssets({type: 'JavaScript', url: query.undefined})[0], this.callback);
            },
            'it should contain 3 one.include statements': function (text) {
                assert.equal(text.match(/one.include/g).length, 3);
            },
            'then running transforms.flattenStaticIncludes': {
                topic: function (text, assetGraph) {
                    assetGraph.transform(
                        transforms.flattenStaticIncludes({isInitial: true}),
                        this.callback
                    );
                },
                'the graph should contain 4 HTMLScript relations': function (assetGraph) {
                    assert.equal(assetGraph.findRelations({type: 'HTMLScript'}).length, 4);
                },
                'The order should be A1.js, B1.js, C1.js, inline script': function (assetGraph) {
                    assert.deepEqual(assetGraph.findRelations({type: 'HTMLScript'}).map(function (htmlScript) {
                        return htmlScript._getRawUrlString();
                    }), ['js/A1.js', 'js/B1.js', 'js/C1.js', undefined]);
                }
            }
        }
    },
    'After loading a test case with includes of overlapping jsb2 packages': {
        topic: function () {
            new AssetGraph({root: __dirname + '/senchaJSBuilder/dependentPackages/'}).transform(
                transforms.registerLabelsAsCustomProtocols('mylabel=' + __dirname + '/senchaJSBuilder/dependentPackages/foo.jsb2'),
                transforms.loadAssets('overlappingIncludes.html'),
                transforms.populate(),
                this.callback
            );
        },
        'the graph should contain a single HTML asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'HTML'}).length, 1);
        },
        'the graph should contain a single inline JavaScript asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript', url: query.undefined}).length, 1);
        },
        'the graph should contain 4 JavaScriptStaticInclude relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'JavaScriptStaticInclude'}).length, 4);
        },
        'then get the inline JavaScript as text': {
            topic: function (assetGraph) {
                assetGraph.getAssetText(assetGraph.findAssets({type: 'JavaScript', url: query.undefined})[0], this.callback);
            },
            'it should contain 4 one.include statements': function (text) {
                assert.equal(text.match(/one.include/g).length, 4);
            },
            'then running transforms.flattenStaticIncludes': {
                topic: function (text, assetGraph) {
                    assetGraph.transform(
                        transforms.flattenStaticIncludes({isInitial: true}),
                        this.callback
                    );
                },
                'the graph should contain 4 HTMLScript relations': function (assetGraph) {
                    assert.equal(assetGraph.findRelations({type: 'HTMLScript'}).length, 4);
                },
                'The order should be A1.js, B1.js, C1.js, inline script': function (assetGraph) {
                    assert.deepEqual(assetGraph.findRelations({type: 'HTMLScript'}).map(function (htmlScript) {
                        return htmlScript._getRawUrlString();
                    }), ['js/A1.js', 'js/B1.js', 'js/C1.js', undefined]);
                }
            }
        }
    }
})['export'](module);
