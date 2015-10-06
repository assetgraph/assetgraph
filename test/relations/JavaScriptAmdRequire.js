/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/JavaScriptAmdRequire', function () {
    it('should handle a test case with an Html asset that loads require.js and uses it in an inline script', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptAmdRequire/simple/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'JavaScriptAmdRequire', 3);
                expect(assetGraph, 'to contain assets', 'JavaScript', 5);

                assetGraph.findRelations({to: {url: /\/a\.js$/}})[0].detach();
                expect(assetGraph, 'to contain relations', 'JavaScriptAmdRequire', 2);

                expect(
                    assetGraph.findAssets({type: 'JavaScript', isInline: true})[0].text,
                    'to equal',
                    'require([\'some/module\',\'b.js\'],function(someModule,b){});'
                );
            })
            .run(done);
    });

    it('should handle a test case with an Html asset that loads require.js and includes a data-main attribute on the script tag', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptAmdRequire/withDataMain/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relation', 'HtmlRequireJsMain');
                expect(assetGraph, 'to contain relations', 'JavaScriptAmdRequire', 4);
                expect(assetGraph, 'to contain relation', 'JavaScriptAmdDefine');
                expect(assetGraph, 'to contain assets', 'JavaScript', 4);
                expect(assetGraph, 'to contain asset', 'Text');
            })
            .run(done);
    });

    it('should handle a test case with require.js and a paths setting', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptAmdRequire/withPaths/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 7);
                expect(assetGraph, 'to contain asset', 'Text');
            })
            .run(done);
    });

    it('should handle a test case with the require.js config in an IIFE in a script', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptAmdRequire/iife/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', {type: 'JavaScript', isLoaded: true}, 3);
            })
            .run(done);
    });

    it('should handle a test case with require.js, a baseUrl and a paths setting', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptAmdRequire/withPathsAndBaseUrl/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 7);
            })
            .run(done);
    });

    it('should handle a test case with require.js, data-main and a paths setting', function (done) {
            new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptAmdRequire/withPathsAndDataMain/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain assets', 'JavaScript', 8);

                    assetGraph.findAssets({url: /\/some\/v1\.0\/module\.js$/})[0].fileName = 'moduleRenamed.js';

                    expect(assetGraph.findRelations({to: {url: /\/some\/v1\.0\/moduleRenamed\.js$/}})[0].href, 'to equal', 'some/moduleRenamed');

                    var asset = assetGraph.findAssets({url: /\/some\/v1\.0\/moduleRenamed\.js$/})[0];
                    asset.url = asset.url.replace(/\/some\/v1.0\//, '/foo/bar/');

                    expect(assetGraph.findRelations({to: {url: /\/foo\/bar\/moduleRenamed\.js$/}})[0].href, 'to equal', 'foo/bar/moduleRenamed');

                    assetGraph.findAssets({url: /\/this\/is\/an\/exactMatch\.js$/})[0].incomingRelations[0].refreshHref();

                    expect(assetGraph.findRelations({to: {url: /\/this\/is\/an\/exactMatch\.js$/}})[0].href, 'to equal', 'exactMatchFoo');

                    assetGraph.findAssets({url: /\/this\/is\/an\/exactMatch\.js$/})[0].fileName = 'exactMatchNoLonger.js';

                    expect(assetGraph.findRelations({to: {url: /\/this\/is\/an\/exactMatchNoLonger\.js$/}})[0].href, 'to equal', 'this/is/an/exactMatchNoLonger');
                })
                .run(done);
    });

    it('should handle a test case where the require.config({...}) statement is in the data-main script', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptAmdRequire/withConfigInDataMain/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 6);

                assetGraph.findAssets({url: /\/my\/module\.js$/})[0].fileName = 'renamedModule.js';
                expect(assetGraph.findRelations({to: {url: /\/my\/renamedModule\.js$/}})[0].href, 'to equal', 'my/renamedModule');

                assetGraph.findRelations({to: {url: /\/my\/renamedModule\.js$/}})[0].hrefType = 'documentRelative';
                expect(assetGraph.findRelations({to: {url: /\/my\/renamedModule\.js$/}})[0].href, 'to equal', 'scripts/my/renamedModule.js');
            })
            .run(done);
    });

    it('should handle a test case with a require() statement followed by a define(<string>, function () {})', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptAmdRequire/alreadyFlattened/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 2);
                expect(assetGraph, 'to contain no relations including unresolved', 'JavaScriptAmdRequire');
            })
            .run(done);
    });

    it('should handle a test case with a require() statement followed by a define(<string>, function () {}) in a comma sequence', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptAmdRequire/alreadyFlattenedSeq/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 2);
                expect(assetGraph, 'to contain no relations including unresolved', 'JavaScriptAmdRequire');
            })
            .run(done);
    });

    it('should handle a test case where the require main module does not have an incoming relation from a html file', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptAmdRequire/noHtml/'})
            .registerRequireJsConfig()
            .loadAssets('main.js')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', {type: 'JavaScript', isLoaded: true}, 2);
                expect(assetGraph, 'to contain relation including unresolved', 'JavaScriptAmdRequire');
            })
            .run(done);
    });

    it('should handle a test case where the require main module doesn\'t have an incoming relation from a html file, but has a requirejs.baseUrl configuration', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptAmdRequire/noHtmlWithConfig/'})
            .registerRequireJsConfig()
            .loadAssets('main.js')
            .populate({from: {type: 'Html'}, followRelations: {type: 'HtmlScript', to: {url: /^file:/}}})
            .assumeRequireJsConfigHasBeenFound()
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', {type: 'JavaScript', isLoaded: true}, 2);
                expect(assetGraph, 'to contain relation including unresolved', 'JavaScriptAmdRequire');
            })
            .run(done);
    });

    it('should handle a test case where require.js is kept as an object, but updated before loading require.js', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptAmdRequire/withSeparateBaseUrlAssignment/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .assumeRequireJsConfigHasBeenFound()
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', {isLoaded: true, text: /Yay/});
            })
            .run(done);
    });

    it('should handle a test case with nested requirejs require statements', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptAmdRequire/lazyRequire/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate({from: {type: 'Html'}, followRelations: {type: 'HtmlScript', to: {url: /^file:/}}})
            .assumeRequireJsConfigHasBeenFound()
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', {type: 'JavaScript', isLoaded: true}, 4);
            })
            .run(done);
    });

    it('should handle a test case where the 2nd require parameter is a symbol ref to a function rather than a function', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptAmdRequire/requireWithSymbolRef/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'JavaScriptAmdRequire', 3);
                expect(assetGraph, 'to contain assets', 'JavaScript', 5);

                assetGraph.findRelations({to: {url: /\/a\.js$/}})[0].detach();
                expect(assetGraph, 'to contain relations', 'JavaScriptAmdRequire', 2);

                expect(
                    assetGraph.findAssets({type: 'JavaScript', isInline: true})[0].text,
                    'to equal',
                    'function hello(){}require([\'some/module\',\'b.js\'],hello);'
                );
            })
            .run(done);
    });
});
