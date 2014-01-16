var vows = require('vows'),
    assert = require('assert'),
    urlTools = require('url-tools'),
    AssetGraph = require('../lib');

vows.describe('JavaScriptRequireJsCommonJsCompatibilityRequire').addBatch({
    'After loading a test case that also has some common.js requires': {
        topic: function () {
            new AssetGraph({root: __dirname + '/JavaScriptRequireJsCommonJsCompatibilityRequire/withCommonJs/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 7 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 7);
        },
        'the graph should contain 0 JavaScriptAmdDefine relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'JavaScriptAmdDefine'}).length, 0);
        },
        'the graph should contain one JavaScriptRequireJsCommonJsCompatibilityRequire relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'JavaScriptRequireJsCommonJsCompatibilityRequire'}).length, 1);
        },
        'the graph should contain 2 JavaScriptCommonJsRequire relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'JavaScriptCommonJsRequire'}).length, 2);
        },
        'the graph should contain over/the/rainbow/foo.js, and it should be loaded': function (assetGraph) {
            assert.equal(assetGraph.findAssets({url: /\/over\/the\/rainbow\/foo\.js$/, isLoaded: true}).length, 1);
        },
        'then run the liftUpJavaScriptRequireJsCommonJsCompatibilityRequire transform': {
            topic: function (assetGraph) {
                assetGraph
                    .liftUpJavaScriptRequireJsCommonJsCompatibilityRequire()
                    .run(this.callback);
            },
            'the graph should contain one JavaScriptAmdDefine relation': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'JavaScriptAmdDefine'}).length, 1);
            },
            'commonJsIsh should have "require", "exports", "module", and "somewhere/foo" in its dependency array': function (assetGraph) {
                assert.equal(assetGraph.findAssets({text: /\["require","exports","module","somewhere\/foo"\]/}).length, 1);
            },
            'then run flattenRequireJs': {
                topic: function (assetGraph) {
                    assetGraph
                        .flattenRequireJs({type: 'Html'})
                        .run(this.callback);
                },
                'the Html asset should have an HtmlScript relation to an asset with the contents of over/the/rainbow/foo.js': function (assetGraph) {
                    assert.equal(assetGraph.findRelations({type: 'HtmlScript', from: {type: 'Html'}, to: {text: /return 42/}}).length, 1);
                }
            }
        }
    },
    'After loading a test case that also has some common.js requires': {
        topic: function () {
            new AssetGraph({root: __dirname + '/JavaScriptRequireJsCommonJsCompatibilityRequire/withCommonJsShorthand/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 7 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 7);
        },
        'the graph should contain 0 JavaScriptAmdDefine relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'JavaScriptAmdDefine'}).length, 0);
        },
        'the graph should contain one JavaScriptRequireJsCommonJsCompatibilityRequire relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'JavaScriptRequireJsCommonJsCompatibilityRequire'}).length, 1);
        },
        'the graph should contain 2 JavaScriptCommonJsRequire relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'JavaScriptCommonJsRequire'}).length, 2);
        },
        'the graph should contain over/the/rainbow/foo.js, and it should be loaded': function (assetGraph) {
            assert.equal(assetGraph.findAssets({url: /\/over\/the\/rainbow\/foo\.js$/, isLoaded: true}).length, 1);
        },
        'then run the liftUpJavaScriptRequireJsCommonJsCompatibilityRequire transform': {
            topic: function (assetGraph) {
                assetGraph
                    .liftUpJavaScriptRequireJsCommonJsCompatibilityRequire()
                    .run(this.callback);
            },
            'the graph should contain one JavaScriptAmdDefine relation': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'JavaScriptAmdDefine'}).length, 1);
            },
            'commonJsIsh should have "require" and "somewhere/foo" in its dependency array': function (assetGraph) {
                assert.equal(assetGraph.findAssets({text: /\["require","somewhere\/foo"\]/}).length, 1);
            },
            'then run flattenRequireJs': {
                topic: function (assetGraph) {
                    assetGraph
                        .flattenRequireJs({type: 'Html'})
                        .run(this.callback);
                },
                'the Html asset should have an HtmlScript relation to an asset with the contents of over/the/rainbow/foo.js': function (assetGraph) {
                    assert.equal(assetGraph.findRelations({type: 'HtmlScript', from: {type: 'Html'}, to: {text: /return 42/}}).length, 1);
                }
            }
        }
    },
    'After loading a test case with the ACE editor': {
        topic: function () {
            new AssetGraph({root: __dirname + '/JavaScriptRequireJsCommonJsCompatibilityRequire/ace/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 76 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 76);
        },
        'the graph should contain 168 JavaScriptRequireJsCommonJsCompatibilityRequire relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'JavaScriptRequireJsCommonJsCompatibilityRequire'}).length, 168);
        },
        'the graph should contain 0 JavaScriptAmdDefine relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'JavaScriptAmdDefine'}).length, 0);
        },
        'then run the liftUpJavaScriptRequireJsCommonJsCompatibilityRequire transform': {
            topic: function (assetGraph) {
                assetGraph
                    .liftUpJavaScriptRequireJsCommonJsCompatibilityRequire()
                    .run(this.callback);
            },
            'the graph should contain 168 JavaScriptAmdDefine relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'JavaScriptAmdDefine'}).length, 168);
            },
            'the graph should still contain 168 JavaScriptRequireJsCommonJsCompatibilityRequire relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'JavaScriptRequireJsCommonJsCompatibilityRequire'}).length, 168);
            },
            'then run the flattenRequireJs transform and inline the JavaScriptGetText relations': {
                topic: function (assetGraph) {
                    assetGraph
                        .flattenRequireJs()
                        .inlineRelations({type: 'JavaScriptGetText'})
                        .run(this.callback);
                },
                'executing all the scripts except the last one should result in no errors': function (assetGraph) {
                    var vm = require('vm'),
                        context = vm.createContext();
                    assetGraph.findRelations({type: 'HtmlScript'}).forEach(function (relation) {
                        var src = relation.to.text;
                        if (/define\((["'])main\1/.test(src)) {
                            return;
                        }
                        vm.runInContext(src, context, relation.to.url);
                    });
                }
            }
        }
    }
})['export'](module);
