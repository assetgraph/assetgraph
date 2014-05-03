var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    urlTools = require('urltools'),
    AssetGraph = require('../lib');

vows.describe('JavaScriptRequireJsCommonJsCompatibilityRequire').addBatch({
    'After loading a test case that also has some common.js requires': {
        topic: function () {
            new AssetGraph({root: __dirname + '/JavaScriptRequireJsCommonJsCompatibilityRequire/withCommonJs/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .run(done);
        },
        'the graph should contain 7 assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 7);
        },
        'the graph should contain 0 JavaScriptAmdDefine relations': function (assetGraph) {
            expect(assetGraph, 'to contain no relations', {type: 'JavaScriptAmdDefine'});
        },
        'the graph should contain one JavaScriptRequireJsCommonJsCompatibilityRequire relation': function (assetGraph) {
            expect(assetGraph, 'to contain relation', 'JavaScriptRequireJsCommonJsCompatibilityRequire');
        },
        'the graph should contain 2 JavaScriptCommonJsRequire relations': function (assetGraph) {
            expect(assetGraph, 'to contain relations', 'JavaScriptCommonJsRequire', 2);
        },
        'the graph should contain over/the/rainbow/foo.js, and it should be loaded': function (assetGraph) {
            expect(assetGraph, 'to contain asset', {url: /\/over\/the\/rainbow\/foo\.js$/, isLoaded: true});
        },
        'then run the liftUpJavaScriptRequireJsCommonJsCompatibilityRequire transform': {
            topic: function (assetGraph) {
                assetGraph
                    .liftUpJavaScriptRequireJsCommonJsCompatibilityRequire()
                    .run(done);
            },
            'the graph should contain one JavaScriptAmdDefine relation': function (assetGraph) {
                expect(assetGraph, 'to contain relation', 'JavaScriptAmdDefine');
            },
            'commonJsIsh should have "require", "exports", "module", and "somewhere/foo" in its dependency array': function (assetGraph) {
                expect(assetGraph, 'to contain asset', {text: /\["require","exports","module","somewhere\/foo"\]/});
            },
            'then run flattenRequireJs': {
                topic: function (assetGraph) {
                    assetGraph
                        .flattenRequireJs({type: 'Html'})
                        .run(done);
                },
                'the Html asset should have an HtmlScript relation to an asset with the contents of over/the/rainbow/foo.js': function (assetGraph) {
                    expect(assetGraph, 'to contain relation', {type: 'HtmlScript', from: {type: 'Html'}, to: {text: /return 42/}});
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
                .run(done);
        },
        'the graph should contain 5 assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 5);
        },
        'the graph should contain 0 JavaScriptAmdDefine relations': function (assetGraph) {
            expect(assetGraph, 'to contain no relations', {type: 'JavaScriptAmdDefine'});
        },
        'the graph should contain one JavaScriptRequireJsCommonJsCompatibilityRequire relation': function (assetGraph) {
            expect(assetGraph, 'to contain relation', 'JavaScriptRequireJsCommonJsCompatibilityRequire');
        },
        'the graph should contain 0 JavaScriptCommonJsRequire relations': function (assetGraph) {
            expect(assetGraph, 'to contain no relations', {type: 'JavaScriptCommonJsRequire'});
        },
        'the graph should contain over/the/rainbow/foo.js, and it should be loaded': function (assetGraph) {
            expect(assetGraph, 'to contain asset', {url: /\/over\/the\/rainbow\/foo\.js$/, isLoaded: true});
        },
        'then run the liftUpJavaScriptRequireJsCommonJsCompatibilityRequire transform': {
            topic: function (assetGraph) {
                assetGraph
                    .liftUpJavaScriptRequireJsCommonJsCompatibilityRequire()
                    .run(done);
            },
            'the graph should contain one JavaScriptAmdDefine relation': function (assetGraph) {
                expect(assetGraph, 'to contain relation', 'JavaScriptAmdDefine');
            },
            'commonJsIsh should have "require" and "somewhere/foo" in its dependency array': function (assetGraph) {
                expect(assetGraph, 'to contain asset', {text: /\["require","somewhere\/foo"\]/});
            },
            'then run flattenRequireJs': {
                topic: function (assetGraph) {
                    assetGraph
                        .flattenRequireJs({type: 'Html'})
                        .run(done);
                },
                'the Html asset should have an HtmlScript relation to an asset with the contents of over/the/rainbow/foo.js': function (assetGraph) {
                    expect(assetGraph, 'to contain relation', {type: 'HtmlScript', from: {type: 'Html'}, to: {text: /return 42/}});
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
                .run(done);
        },
        'the graph should contain 76 assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 76);
        },
        'the graph should contain 168 JavaScriptRequireJsCommonJsCompatibilityRequire relation': function (assetGraph) {
            expect(assetGraph, 'to contain relations', 'JavaScriptRequireJsCommonJsCompatibilityRequire', 168);
        },
        'the graph should contain 0 JavaScriptAmdDefine relations': function (assetGraph) {
            expect(assetGraph, 'to contain no relations', {type: 'JavaScriptAmdDefine'});
        },
        'then run the liftUpJavaScriptRequireJsCommonJsCompatibilityRequire transform': {
            topic: function (assetGraph) {
                assetGraph
                    .liftUpJavaScriptRequireJsCommonJsCompatibilityRequire()
                    .run(done);
            },
            'the graph should contain 168 JavaScriptAmdDefine relations': function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'JavaScriptAmdDefine', 168);
            },
            'the graph should still contain 168 JavaScriptRequireJsCommonJsCompatibilityRequire relations': function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'JavaScriptRequireJsCommonJsCompatibilityRequire', 168);
            },
            'then run the flattenRequireJs transform and inline the JavaScriptGetText relations': {
                topic: function (assetGraph) {
                    assetGraph
                        .flattenRequireJs()
                        .inlineRelations({type: 'JavaScriptGetText'})
                        .run(done);
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
