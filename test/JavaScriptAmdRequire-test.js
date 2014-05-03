var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    _ = require('underscore'),
    AssetGraph = require('../lib');

vows.describe('relations.JavaScriptAmdRequire').addBatch({
    'After loading test case with an Html asset that loads require.js and uses it in an inline script': {
        topic: function () {
            new AssetGraph({root: __dirname + '/JavaScriptAmdRequire/simple/'})
                .loadAssets('index.html')
                .populate()
                .run(done);
        },
        'the graph should contain 3 JavaScriptAmdRequire relations': function (assetGraph) {
            expect(assetGraph, 'to contain relations', 'JavaScriptAmdRequire', 3);
        },
        'the graph should contain 5 JavaScript assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'JavaScript', 5);
        },
        'then detach the JavaScriptAmdRequire relation pointing at a.js': {
            topic: function (assetGraph) {
                assetGraph.findRelations({to: {url: /\/a\.js$/}})[0].detach();
                return assetGraph;
            },
            'the graph should contain 2 JavaScriptAmdRequire relations': function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'JavaScriptAmdRequire', 2);
            },
            'a.js and the corresponding function parameter should be removed from the including asset': function (assetGraph) {
                expect(
                    assetGraph.findAssets({type: 'JavaScript', isInline: true})[0].text,
                    'to equal',
                    'require(["some/module","b.js"],function(someModule,b){});'
                );
            }
        }
    },
    'After loading test case with an Html asset that loads require.js and includes a data-main attribute on the script tag': {
        topic: function () {
            new AssetGraph({root: __dirname + '/JavaScriptAmdRequire/withDataMain/'})
                .loadAssets('index.html')
                .populate()
                .run(done);
        },
        'the graph should contain a HtmlRequireJsMain relation': function (assetGraph) {
            expect(assetGraph, 'to contain relation', 'HtmlRequireJsMain');
        },
        'the graph should contain 4 JavaScriptAmdRequire relations': function (assetGraph) {
            expect(assetGraph, 'to contain relations', 'JavaScriptAmdRequire', 4);
        },
        'the graph should contain one JavaScriptAmdDefine relation': function (assetGraph) {
            expect(assetGraph, 'to contain relation', 'JavaScriptAmdDefine');
        },
        'the graph should contain 4 JavaScript assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'JavaScript', 4);
        },
        'the graph should contain a Text asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Text');
        }
    },
    'After loading test case with require.js and a paths setting': {
        topic: function () {
            new AssetGraph({root: __dirname + '/JavaScriptAmdRequire/withPaths/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .run(done);
        },
        'the graph should contain 7 JavaScript assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'JavaScript', 7);
        },
        'the graph should contain 1 Text asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Text');
        }
    },
    'After loading test case with the require.js config in an IIFE in a script': {
        topic: function () {
            new AssetGraph({root: __dirname + '/JavaScriptAmdRequire/iife/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .run(done);
        },
        'the graph should contain 3 loaded JavaScript assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', {type: 'JavaScript', isLoaded: true}, 3);
        }
    },
    'After loading test case with require.js, a baseUrl and a paths setting': {
        topic: function () {
            new AssetGraph({root: __dirname + '/JavaScriptAmdRequire/withPathsAndBaseUrl/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .run(done);
        },
        'the graph should contain 7 JavaScript assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'JavaScript', 7);
        }
    },
    'After loading test case with require.js, data-main and a paths setting': {
        topic: function () {
            new AssetGraph({root: __dirname + '/JavaScriptAmdRequire/withPathsAndDataMain/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .run(done);
        },
        'the graph should contain 8 JavaScript assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'JavaScript', 8);
        },
        'then rename the module referenced as some/module': {
            topic: function (assetGraph) {
                assetGraph.findAssets({url: /\/some\/v1\.0\/module\.js$/})[0].fileName = 'moduleRenamed.js';
                return assetGraph;
            },
            'the incoming relation should still utilize the paths setting': function (assetGraph) {
                var relation = assetGraph.findRelations({to: {url: /\/some\/v1\.0\/moduleRenamed\.js$/}})[0];
                expect(relation.href, 'to equal', 'some/moduleRenamed');
            },
            'then move the module outside some/v1.0/': {
                topic: function (assetGraph) {
                    var asset = assetGraph.findAssets({url: /\/some\/v1\.0\/moduleRenamed\.js$/})[0];
                    asset.url = asset.url.replace(/\/some\/v1.0\//, '/foo/bar/');
                    return assetGraph;
                },
                'the incoming relation should no longer utilize the paths setting': function (assetGraph) {
                    var relation = assetGraph.findRelations({to: {url: /\/foo\/bar\/moduleRenamed\.js$/}})[0];
                    expect(relation.href, 'to equal', 'foo/bar/moduleRenamed');
                }
            }
        },
        'then call refreshHref on the relation pointing at exactMatchFoo': {
            topic: function (assetGraph) {
                var asset = assetGraph.findAssets({url: /\/this\/is\/an\/exactMatch\.js$/})[0].incomingRelations[0].refreshHref();
                return assetGraph;
            },
            'the incoming relation should still utilize the paths setting': function (assetGraph) {
                var relation = assetGraph.findRelations({to: {url: /\/this\/is\/an\/exactMatch\.js$/}})[0];
                expect(relation.href, 'to equal', 'exactMatchFoo');
            },
            'then rename the module referenced as exactMatch': {
                topic: function (assetGraph) {
                    var asset = assetGraph.findAssets({url: /\/this\/is\/an\/exactMatch\.js$/})[0];
                    asset.fileName = 'exactMatchNoLonger.js';
                    return assetGraph;
                },
                'the incoming relation should no longer utilize the paths setting': function (assetGraph) {
                    var relation = assetGraph.findRelations({to: {url: /\/this\/is\/an\/exactMatchNoLonger\.js$/}})[0];
                    expect(relation.href, 'to equal', 'this/is/an/exactMatchNoLonger');
                }
            }
        }
    },
    'After loading test case where the require.config({...}) statement is in the data-main script': {
        topic: function () {
            new AssetGraph({root: __dirname + '/JavaScriptAmdRequire/withConfigInDataMain/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .run(done);
        },
        'the graph should contain 6 JavaScript assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'JavaScript', 6);
        },
        'then move my/module': {
            topic: function (assetGraph) {
                assetGraph.findAssets({url: /\/my\/module\.js$/})[0].fileName = "renamedModule.js";
                return assetGraph;
            },
            'the href of its incoming JavaScriptAmdRequre relation should be updated': function (assetGraph) {
                expect(assetGraph.findRelations({to: {url: /\/my\/renamedModule\.js$/}})[0].href, 'to equal', 'my/renamedModule');
            },
            'then change the hrefType of the relation pointing at my/renamedModule': {
                topic: function (assetGraph) {
                    assetGraph.findRelations({to: {url: /\/my\/renamedModule\.js$/}})[0].hrefType = 'documentRelative';
                    return assetGraph;
                },
                'the href should be updated again': function (assetGraph) {
                    expect(assetGraph.findRelations({to: {url: /\/my\/renamedModule\.js$/}})[0].href, 'to equal', 'scripts/my/renamedModule.js');
                }
            }
        }
    },
    'After loading test case with a require() statement followed by a define(<string>, function () {})': {
        topic: function () {
            new AssetGraph({root: __dirname + '/JavaScriptAmdRequire/alreadyFlattened/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .run(done);
        },
        'the graph should contain 2 JavaScript assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'JavaScript', 2);
        },
        'the graph should contain no JavaScriptAmdRequire relations': function (assetGraph) {
            expect(assetGraph, 'to contain no relations including unresolved', 'JavaScriptAmdRequire');
        }
    },
    'After loading test case with a require() statement followed by a define(<string>, function () {}) in a comma sequence': {
        topic: function () {
            new AssetGraph({root: __dirname + '/JavaScriptAmdRequire/alreadyFlattenedSeq/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .run(done);
        },
        'the graph should contain 2 JavaScript assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'JavaScript', 2);
        },
        'the graph should contain no JavaScriptAmdRequire relations': function (assetGraph) {
            expect(assetGraph, 'to contain no relations including unresolved', 'JavaScriptAmdRequire');
        }
    },
    'After loading test case where the require main module doesn\'t have an incoming relation from a html file': {
        topic: function () {
            new AssetGraph({root: __dirname + '/JavaScriptAmdRequire/noHtml/'})
                .registerRequireJsConfig()
                .loadAssets('main.js')
                .populate()
                .run(done);
        },
        'the graph should contain 2 JavaScript assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', {type: 'JavaScript', isLoaded: true}, 2);
        },
        'the graph should contain 1 JavaScriptAmdRequire relations': function (assetGraph) {
            expect(assetGraph, 'to contain relation including unresolved', 'JavaScriptAmdRequire');
        }
    },
    'After loading test case where the require main module doesn\'t have an incoming relation from a html file, but has a requirejs.baseUrl configuration': {
        topic: function () {
            new AssetGraph({root: __dirname + '/JavaScriptAmdRequire/noHtmlWithConfig/'})
                .registerRequireJsConfig()
                .loadAssets('main.js')
                .populate({from: {type: 'Html'}, followRelations: {type: 'HtmlScript', to: {url: /^file:/}}})
                .assumeRequireJsConfigHasBeenFound()
                .populate()
                .run(done);
        },
        'the graph should contain 2 JavaScript assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', {type: 'JavaScript', isLoaded: true}, 2);
        },
        'the graph should contain 1 JavaScriptAmdRequire relations': function (assetGraph) {
            expect(assetGraph, 'to contain relation including unresolved', 'JavaScriptAmdRequire');
        }
    }
})['export'](module);
