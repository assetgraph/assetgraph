var expect = require('./unexpected-with-plugins'),
    _ = require('underscore'),
    fs = require('fs'),
    path = require('path'),
    AssetGraph = require('../lib'),
    uglifyJs = AssetGraph.JavaScript.uglifyJs,
    uglifyAst = AssetGraph.JavaScript.uglifyAst;


describe('flattenRequireJs', function () {
    it('should handle the jquery-require-sample test case', function (done) {
        new AssetGraph({root: __dirname + '/flattenRequireJs/jquery-require-sample/webapp/'})
            .registerRequireJsConfig()
            .loadAssets('app.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 6);
                expect(assetGraph, 'to contain relation', 'HtmlRequireJsMain');
                expect(assetGraph, 'to contain assets', 'JavaScript', 5);
            })
            .flattenRequireJs({type: 'Html'})
            .queue(function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                expect(htmlScripts, 'to have length', 4);
                expect(htmlScripts[0].href, 'to equal', 'scripts/require-jquery.js');
                expect(htmlScripts[1].to, 'to have the same AST as', function () {
                    $.fn.alpha = function() {
                        return this.append("<p>Alpha is Go!</p>");
                    };
                    define("jquery.alpha", function (){});
                });
                assertAstsEqual(htmlScripts[2].to.parseTree, function () {
                    $.fn.beta = function () {
                        return this.append("<p>Beta is Go!</p>");
                    };
                    define("jquery.beta", function () {});
                });
                assertAstsEqual(htmlScripts[3].to.parseTree, function () {
                    require(["jquery", "jquery.alpha", "jquery.beta"], function ($) {
                        $(function () {
                            $("body").alpha().beta();
                        });
                    });
                    define("main", function () {});
                });
            })
            .run(done);
    });

    it('should handle a test case with a text dependency', function (done) {
        new AssetGraph({root: __dirname + '/flattenRequireJs/textDependency/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 2);
                expect(assetGraph, 'to contain asset', {type: 'Text', isInline: false});
            })
            .flattenRequireJs({type: 'Html'})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relation', {type: 'JavaScriptGetText', to: {url: /\/myTextFile\.txt$/}});

                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                expect(htmlScripts, 'to have length', 3);
                expect(htmlScripts[0].href, 'to equal', 'require.js');
                assertAstsEqual(htmlScripts[1].to.parseTree, function () {
                    define("myTextFile.txt",GETTEXT("myTextFile.txt"));
                });
                assertAstsEqual(htmlScripts[2].to.parseTree, function () {
                    require(["myTextFile.txt"], function (contentsOfMyTextFile) {
                        alert(contentsOfMyTextFile + ", yay!");
                    });
                    define("main", function () {});
                });
            })
            .inlineRelations({type: 'JavaScriptGetText'})
            .queue(function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                expect(htmlScripts, 'to have length', 3);
                expect(htmlScripts[0].href, 'to equal', 'require.js');
                assertAstsEqual(htmlScripts[1].to.parseTree, function () {
                    define("myTextFile.txt", "THE TEXT!\n");
                });
                assertAstsEqual(htmlScripts[2].to.parseTree, function () {
                    require(["myTextFile.txt"], function (contentsOfMyTextFile) {
                        alert(contentsOfMyTextFile + ", yay!");
                    });
                    define("main", function(){});
                });
            })
            .run(done);
    });

    it('should handle a test case with a module that has multiple incoming JavaScriptAmd* relations', function (done) {
        new AssetGraph({root: __dirname + '/flattenRequireJs/multipleIncoming/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 5);
            })
            .flattenRequireJs({type: 'Html'})
            .queue(function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                expect(htmlScripts, 'to have length', 5);
                expect(htmlScripts[0].href, 'to equal', 'require.js');
                assertAstsEqual(htmlScripts[1].to.parseTree, function () {
                    define("popular", function(){
                        alert("I\'m a popular helper module");
                        return "foo";
                    });
                });
                assertAstsEqual(htmlScripts[2].to.parseTree, function () {
                    define("module1", ["popular"], function () {
                        return"module1";
                    });
                });
                assertAstsEqual(htmlScripts[3].to.parseTree, function () {
                    define("module2", ["popular"], function () {
                        return"module2";
                    });
                });
                assertAstsEqual(htmlScripts[4].to.parseTree, function () {
                    require(["module1", "module2"], function (module1, module2) {
                        alert("Got it all!");
                    });
                    define("main", function () {});
                });
            })
            .run(done);
    });

    it('should handle a case with a module that has multiple incoming JavaScriptAmd* relations', function (done) {
        new AssetGraph({root: __dirname + '/flattenRequireJs/multipleIncoming2/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 4);
            })
            .flattenRequireJs({type: 'Html'})
            .queue(function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                expect(htmlScripts, 'to have length', 4);
                expect(htmlScripts[0].href, 'to equal', 'require.js');
                assertAstsEqual(htmlScripts[1].to.parseTree, function () {
                    define("module2", [], function () {
                        return "module2";
                    });
                });
                assertAstsEqual(htmlScripts[2].to.parseTree, function () {
                    define("module1", ["module2"], function () {
                        return "module1";
                    });
                });
                assertAstsEqual(htmlScripts[3].to.parseTree, function () {
                    require(["module1", "module2"], function (module1, module2) {
                        alert("Got it all!");
                    });
                    define("main", function () {});
                });
            })
            .run(done);
    });

    it('should handle a test case with a module that is included via a script tag and a JavaScriptAmdRequire relation', function (done) {
        new AssetGraph({root: __dirname + '/flattenRequireJs/nonOrphanedJavaScript/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 3);
                expect(assetGraph, 'to contain relations', 'HtmlScript', 2);
            })
            .flattenRequireJs({type: 'Html'})
            .queue(function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                expect(htmlScripts, 'to have length', 4);
                expect(htmlScripts[0].href, 'to equal', 'includedInHtmlAndViaRequire.js');
                expect(htmlScripts[1].href, 'to equal', 'require.js');
                assertAstsEqual(htmlScripts[2].to.parseTree, function () {
                    alert("includedInHtmlAndViaRequire.js");
                    define("includedInHtmlAndViaRequire", function (){});
                });
                assertAstsEqual(htmlScripts[3].to.parseTree, function () {
                    require(["includedInHtmlAndViaRequire"], function (foo){
                        alert("Here we are!");
                    });
                    define("main", function (){});
                });
            })
            .run(done);
    });


    it('should handle a test case that uses require(...) in a regular <script>', function (done) {
        new AssetGraph({root: __dirname + '/flattenRequireJs/withoutHtmlRequireJsMain/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 5);
            })
            .flattenRequireJs({type: 'Html'})
            .queue(function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                expect(htmlScripts, 'to have length', 5);
                expect(htmlScripts[0].href, 'to equal', 'require.js');
                assertAstsEqual(htmlScripts[1].to.parseTree, function () {
                    define("popular", function () {
                        alert("I'm a popular helper module");
                        return "foo";
                    });
                });
                assertAstsEqual(htmlScripts[2].to.parseTree, function () {
                    define("module1", ["popular"], function(){
                        return "module1";
                    });
                });
                assertAstsEqual(htmlScripts[3].to.parseTree, function () {
                    define("module2", ["popular"], function () {
                        return "module2";
                    });
                });
                assertAstsEqual(htmlScripts[4].to.parseTree, function () {
                    require(["module1", "module2"], function () {
                        alert("Got it all!");
                    });
                });
            })
            .run(done);
    });

    it('should handle a test case that uses require(...) to fetch a css file', function (done) {
        new AssetGraph({root: __dirname + '/flattenRequireJs/cssRequire/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 2);
                expect(assetGraph, 'to contain relation', 'JavaScriptAmdRequire');
                expect(assetGraph, 'to contain asset', 'Css');
                expect(assetGraph, 'to contain relation', 'CssImage');
                expect(assetGraph, 'to contain asset', 'Png');
            })
            .flattenRequireJs({type: 'Html'})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relation', 'HtmlStyle');
                expect(assetGraph, 'to contain asset', 'Css');
                expect(assetGraph, 'to contain relation', 'CssImage');
                expect(assetGraph, 'to contain asset', 'Png');
            })
            .run(done);
    });

    it('should handle a test case that includes a GETSTATICURL relation', function (done) {
        new AssetGraph({root: __dirname + '/flattenRequireJs/withOneGetStaticUrl/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 5);
                expect(assetGraph, 'to contain relation', 'JavaScriptGetStaticUrl');
                expect(assetGraph, 'to contain relation', 'StaticUrlMapEntry');
                expect(assetGraph, 'to contain asset', 'Png');
            })
            .flattenRequireJs({type: 'Html'})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Png');

                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                expect(htmlScripts, 'to have length', 5);
                expect(htmlScripts[0].to.url, 'to match', /\/require\.js$/);

                assertAstsEqual(htmlScripts[1].to.parseTree, function () {
                    define("module2", function() {
                        return "module2, who's my url?" + GETSTATICURL("foo.png");
                    });
                });
                assertAstsEqual(htmlScripts[2].to.parseTree, function () {
                    define("module1", ["module2"], function() {
                        return "module1";
                    });
                });
                assertAstsEqual(htmlScripts[3].to.parseTree, function () {
                    define("module3", function() {
                        alert("module3.js");
                    });
                });
                assertAstsEqual(htmlScripts[4].to.parseTree, function () {
                    require(["module1", "module2", "module3"], function (module1, module2, module3) {
                        alert("Got it all");
                    });
                    define("main", function (){});
                });
            })
            .run(done);
    });

    it('should handle an umd test case', function (done) {
        new AssetGraph({root: __dirname + '/flattenRequireJs/umd/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .flattenRequireJs({type: 'Html'})
            .queue(function (assetGraph) {
            var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                expect(htmlScripts, 'to have length', 3);
                expect(htmlScripts[0].to.url, 'to match', /\/require\.js$/);

                assertAstsEqual(htmlScripts[1].to.parseTree, function () {
                    define("myumdmodule", function () {
                        return true;
                    });
                });

                assertAstsEqual(htmlScripts[2].to.parseTree, function () {
                    require(['myumdmodule'], function (myUmdModule) {
                        alert(myUmdModule);
                    });
                    define("main", function () {});
                });
            })
            .run(done);
    });

    it('should handle the umd test case without requirejs', function (done) {
        new AssetGraph({root: __dirname + '/flattenRequireJs/umdWithoutRequire/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                assetGraph._localstorageText = assetGraph.findAssets({
                    url: /backbone.localStorage.js$/
                })[0].text;
            })
            .flattenRequireJs({type: 'Html', isFragment: false})
            .queue(function (assetGraph) {
                var scriptRelations = assetGraph.findRelations({
                    to: {
                        type: 'JavaScript'
                    }
                });
                expect(scriptRelations, 'to have length', 3);

                var relations = assetGraph.findRelations({type: 'JavaScriptAmdDefine'});
                expect(relations, 'to have length', 0);
            })
            .run(done);
    });

    it('should handle an umd test case where the wrapper has a dependency in the define call', function (done) {
        new AssetGraph({root: __dirname + '/flattenRequireJs/umdWithDependency/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .flattenRequireJs({type: 'Html'})
            .queue(function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                expect(htmlScripts, 'to have length', 4);
                expect(htmlScripts[0].href, 'to equal', 'require.js');
                assertAstsEqual(htmlScripts[1].to.parseTree, function () {
                    define("someDependency", function (){
                        alert("got the dependency!");
                    });
                });
                assertAstsEqual(htmlScripts[2].to.parseTree, function () {
                    define("myumdmodule", ["someDependency"], function (someDependency) {
                        return true;
                    });
                });
                assertAstsEqual(htmlScripts[3].to.parseTree, function () {
                    require(['myumdmodule'], function (myUmdModule) {
                        alert(myUmdModule);
                    });
                    define("main",function(){});
                });
            })
            .run(done);
    });

    it('should handle a non-umd test case', function (done) {
        new AssetGraph({root: __dirname + '/flattenRequireJs/nonUmd/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .flattenRequireJs({type: 'Html'})
            .queue(function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                expect(htmlScripts, 'to have length', 3);
                expect(htmlScripts[0].href, 'to equal', 'require.js');
                assertAstsEqual(htmlScripts[1].to.parseTree, function () {
                    (function (global){
                        var signals = function () {return true;};

                        if (typeof define === 'function' && define.amd) {
                            define('signals', function () { return signals; });
                        } else if (typeof module !== 'undefined' && module.exports) {
                            module.exports = signals;
                        } else {
                            global['signals'] = signals;
                        }
                   }(this));
                });
                assertAstsEqual(htmlScripts[2].to.parseTree, function () {
                    require(['signals'], function (myUmdModule) {
                        alert(signals);
                    });
                    define("main",function(){});
                });
            })
            .run(done);
    });

    it('should handle a test case with multiple Html files depending on the same modules', function (done) {
        new AssetGraph({root: __dirname + '/flattenRequireJs/multipleHtmls/'})
            .registerRequireJsConfig()
            .loadAssets('*.html')
            .populate()
            .flattenRequireJs({type: 'Html'})
            .queue(function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript', from: {url: /\/index1\.html$/}});
                expect(htmlScripts, 'to have length', 4);
                assertAstsEqual(htmlScripts[1].to.parseTree, function () {
                    define("someDependency", function () {
                        alert("here is the dependency of the common module");
                    });
                });
                assertAstsEqual(htmlScripts[2].to.parseTree, function () {
                    define("commonModule", ["someDependency"], function () {
                        alert("here is the common module");
                    });
                });
                assertAstsEqual(htmlScripts[3].to.parseTree, function () {
                    require(["commonModule"], function (commonModule){
                        alert("here we are in app1!");
                    });
                    define("app1", function () {});
                });

                htmlScripts = assetGraph.findRelations({type: 'HtmlScript', from: {url: /\/index2\.html$/}});
                expect(htmlScripts, 'to have length', 4);
                assertAstsEqual(htmlScripts[1].to.parseTree, function () {
                    define("someDependency", function () {
                        alert("here is the dependency of the common module");
                    });
                });
                assertAstsEqual(htmlScripts[2].to.parseTree, function () {
                    define("commonModule", ["someDependency"], function () {
                        alert("here is the common module");
                    });
                });
                assertAstsEqual(htmlScripts[3].to.parseTree, function () {
                    require(["commonModule"], function (commonModule){
                        alert("here we are in app2!");
                    });
                    define("app2", function () {});
                });
            })
            .run(done);
    });

    it('should handle a test case using the less! plugin', function (done) {
        new AssetGraph({root: __dirname + '/flattenRequireJs/lessPlugin/'})
            .registerRequireJsConfig()
            .loadAssets('index*.html')
            .populate()
            .flattenRequireJs({type: 'Html'})
            .queue(function (assetGraph) {
                expect(_.pluck(assetGraph.findRelations({type: 'HtmlStyle', from: {url: /\/index\.html$/}}), 'href'), 'to equal', [
                    'b.less',
                    'a.less',
                    'c.less'
                ]);

                expect(_.pluck(assetGraph.findRelations({type: 'HtmlStyle', from: {url: /\/index2\.html$/}}), 'href'), 'to equal', [
                    'b.less',
                    'a.less',
                    'c.less'
                ]);
            })
            .run(done);
    });

    it('should handle a test case with a shims config', function (done) {
        new AssetGraph({root: __dirname + '/flattenRequireJs/shim/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .queue(function (assetGraph) {
                expect(assetGraph.requireJsConfig.shim, 'to equal', {
                    nonAmdModule1: {deps: ['someDependency']},
                    nonAmdModule2: {exports: 'foo.bar', deps: ['someOtherDependency']}
                });
            })
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'JavaScriptShimRequire', 2);
            })
            .flattenRequireJs()
            .queue(function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                expect(htmlScripts, 'to have length', 7);
                expect(htmlScripts[0].to.text, 'to match', /var require\s*=/);
                expect(htmlScripts[1].to.url, 'to match', /\/require\.js$/);

                assertAstsEqual(htmlScripts[2].to.parseTree, function () {
                    alert('someDependency');
                    define('someDependency', function () {});
                });
                assertAstsEqual(htmlScripts[3].to.parseTree, function () {
                    alert('nonAmdModule1');
                    define('nonAmdModule1', function () {});
                });
                assertAstsEqual(htmlScripts[4].to.parseTree, function () {
                    alert('someOtherDependency');
                    define('someOtherDependency', function () {});
                });
                assertAstsEqual(htmlScripts[5].to.parseTree, function () {
                    alert('nonAmdModule2');
                    window.foo = {bar: 'foo dot bar'};
                    define('nonAmdModule2', function () {return foo.bar;});
                });
                assertAstsEqual(htmlScripts[6].to.parseTree, function () {
                    require(['nonAmdModule1', 'nonAmdModule2'], function (nonAmdModule1, nonAmdModule2) {
                        alert("Got 'em all!");
                    });
                    define('main', function () {});
                });
            })
            .run(done);
    });

    it('should handle a test case with a non-string items in the require array', function (done) {
        new AssetGraph({root: __dirname + '/flattenRequireJs/nonString/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(_.pluck(assetGraph.findAssets({type: 'JavaScript'}), 'url').sort(), 'to equal', [
                    assetGraph.root + 'main.js',
                    assetGraph.root + 'require.js',
                    assetGraph.root + 'something.js'
                ]);
            })
            .flattenRequireJs({type: 'Html'})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 5);
            })
            .run(done);
    });

    it('should handle a test case with relative dependencies', function (done) {
        new AssetGraph({root: __dirname + '/flattenRequireJs/relativeDependencies/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(_.pluck(assetGraph.findAssets({type: 'JavaScript'}), 'url').sort(), 'to equal', [
                    assetGraph.root + 'main.js',
                    assetGraph.root + 'require.js',
                    assetGraph.root + 'subdir/bar.js',
                    assetGraph.root + 'subdir/foo.js',
                    assetGraph.root + 'subdir/subsubdir/quux.js'
                ]);
            })
            .flattenRequireJs({type: 'Html'})
            .queue(function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                expect(htmlScripts, 'to have length', 5);

                expect(htmlScripts[0].to.url, 'to match', /\/require\.js$/);
                assertAstsEqual(htmlScripts[1].to.parseTree, function () {
                    define("subdir/subsubdir/quux", function () {
                        alert("quux!");
                    });
                });

                assertAstsEqual(htmlScripts[2].to.parseTree, function () {
                    define("subdir/bar", ["./subsubdir/quux"], function (quux) {
                        alert("bar!");
                    });
                });

                assertAstsEqual(htmlScripts[3].to.parseTree, function () {
                    define("subdir/foo", ["./bar", "./subsubdir/quux"], function (bar) {
                        alert("foo!");
                    });
                });

                assertAstsEqual(htmlScripts[4].to.parseTree, function () {
                    require(["subdir/foo"], function (foo) {
                        alert("Got 'em all!");
                    });
                    define("main", function () {});
                });
            })
            .run(done);
    });

    it('should handle a test case with a relative dependencies once again', function (done) {
        new AssetGraph({root: __dirname + '/flattenRequireJs/relativeDependencies/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(_.pluck(assetGraph.findAssets({type: 'JavaScript'}), 'url').sort(), 'to equal', [
                    assetGraph.root + 'main.js',
                    assetGraph.root + 'require.js',
                    assetGraph.root + 'subdir/bar.js',
                    assetGraph.root + 'subdir/foo.js',
                    assetGraph.root + 'subdir/subsubdir/quux.js'
                ]);

                var quuxJs = assetGraph.findAssets({url: /\/quux\.js/})[0];
                quuxJs.url = quuxJs.url.replace(/subsubdir/, 'othersubdir');
            })
            .flattenRequireJs({type: 'Html'})
            .queue(function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                expect(htmlScripts, 'to have length', 5);
                expect(htmlScripts[0].href, 'to equal', 'require.js');
                assertAstsEqual(htmlScripts[1].to.parseTree, function () {
                    define("subdir/othersubdir/quux", function () {
                        alert("quux!");
                    });
                });
                assertAstsEqual(htmlScripts[2].to.parseTree, function () {
                    define("subdir/bar", ["./othersubdir/quux"], function (quux) {
                        alert("bar!");
                    });
                });
                assertAstsEqual(htmlScripts[3].to.parseTree, function () {
                    define("subdir/foo", ["./bar", "./othersubdir/quux"], function (bar) {
                        alert("foo!");
                    });
                });
                assertAstsEqual(htmlScripts[4].to.parseTree, function () {
                    require(["subdir/foo"], function (foo) {
                        alert("Got 'em all!");
                    });
                    define("main", function () {});
                });
            })
            .run(done);
    });

    it('should handle a test case with a paths config that points jquery at a CDN', function (done) {
        new AssetGraph({root: __dirname + '/flattenRequireJs/httpPath/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(_.pluck(assetGraph.findAssets({type: 'JavaScript', isInline: false}), 'url').sort(), 'to equal', [
                    assetGraph.root + 'main.js',
                    assetGraph.root + 'require.js',
                    'http://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js'
                ]);
            })
            .run(done);
    });

    it('should handle aa test case with a root-relative require alongside a non-root-relative require to the same file', function (done) {
        new AssetGraph({root: __dirname + '/flattenRequireJs/rootRelative/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Text');
            })
            .flattenRequireJs()
            .queue(function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                expect(htmlScripts, 'to have length', 3);
                expect(htmlScripts[0].href, 'to equal', 'require.js');
                assertAstsEqual(htmlScripts[1].to.parseTree, function () {
                    define("foo.txt", GETTEXT("foo.txt"));
                });
                assertAstsEqual(htmlScripts[2].to.parseTree, function () {
                    require(['foo.txt', 'foo.txt'], function (fooText1, fooText2){
                        alert("fooText1=" + fooText1 + " fooText2=" + fooText2);
                    });
                    define("main", function () {});
                });
            })
            .run(done);
    });

    it('should handle a test case with a paths config that maps theLibrary to 3rdparty/theLibrary', function (done) {
        new AssetGraph({root: __dirname + '/flattenRequireJs/paths/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 5);
            })
            .flattenRequireJs()
            .queue(function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                expect(htmlScripts, 'to have length', 5);
                expect(htmlScripts[0].to.url, 'to match', /\/require\.js$/);

                assertAstsEqual(htmlScripts[1].to.parseTree, function () {
                    define('theLibrary', function () {
                        return 'the contents of theLibrary';
                    });
                });
                assertAstsEqual(htmlScripts[2].to.parseTree, function () {
                    define("subdir/bar", function () {
                        return "bar";
                    });
                });
                assertAstsEqual(htmlScripts[3].to.parseTree, function () {
                    define("subdir/foo", ["./bar"], function (bar) {
                        alert("Got bar: " + bar);
                        return {};
                    });
                });
                assertAstsEqual(htmlScripts[4].to.parseTree, function () {
                    require.config({
                        paths: {
                            theLibrary: '3rdparty/theLibrary'
                        }
                    });
                    require(['theLibrary', 'subdir/foo'], function (theLibrary) {
                        alert("Got the library: " + theLibrary);
                    });
                    define("main", function () {});
                });
            })
            .run(done);
    });

    it('should handle a test case with document-relative dependencies', function (done) {
        new AssetGraph({root: __dirname + '/flattenRequireJs/documentRelativeDependencies/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', {type: 'JavaScript', isLoaded: true}, 5);
            })
            .flattenRequireJs()
            .queue(function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                expect(htmlScripts, 'to have length', 5);
                expect(htmlScripts[0].href, 'to equal', 'require.js');
                assertAstsEqual(htmlScripts[1].to.parseTree, function () {
                    define('/thingAtTheRoot.js', function () {
                        return 'thing at the root';
                    });
                });
                assertAstsEqual(htmlScripts[2].to.parseTree, function () {
                    define('anotherThingAtTheRoot.js', function () {
                        return 'another thing at the root';
                    });
                });
                assertAstsEqual(htmlScripts[3].to.parseTree, function () {
                    define('thingInScripts', function () {
                        return 'thing in scripts';
                    });
                });
                assertAstsEqual(htmlScripts[4].to.parseTree, function () {
                    require(['/thingAtTheRoot.js', 'anotherThingAtTheRoot.js', 'thingInScripts'], function (thingAtTheRoot, anotherThingAtTheRoot, thingInScripts) {
                        alert('got ' + thingAtTheRoot + ', ' + anotherThingAtTheRoot + ', and ' + thingInScripts);
                    });
                    define('main', function () {});
                });
            })
            .run(done);
    });

    it('should handle a test case with a data-main that only contains a define (#127)', function (done) {
        new AssetGraph({root: __dirname + '/flattenRequireJs/issue127/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 2);
            })
            .flattenRequireJs()
            .queue(function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                expect(htmlScripts, 'to have length', 2);
                expect(htmlScripts[0].href, 'to equal', 'require.js');
                assertAstsEqual(htmlScripts[1].to.parseTree, function () {
                    define('main', function () {
                        alert('It gets lonely in here if nobody runs me');
                    });
                    require(['main']);
                });
            })
            .run(done);
    });

    /*
    // This is a common mistake that require.js tolerates, although it does have the side effect that the module definition
    // function is run twice. This test case asserts that flattenRequireJs emits an error as the build will be broken.
    it('should handle a test case with a module that is referred to both with and without the .js extension', function (done) {
        var warns = [];
        new AssetGraph({root: __dirname + '/flattenRequireJs/multipleIncomingWithAndWithoutDotJsSuffix/'})
            .on('warn', function (err) {
                warns.push(err);
            })
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(warns, 'to have length', 0);
                expect(assetGraph, 'to contain assets', 'JavaScript', 5);
            })
            .flattenRequireJs()
            .queue(function (assetGraph) {
                expect(warns, 'This test has failed once in a random manner. If you see this again expect it to be a race condition', 'to be ok');
                expect(warns, 'to have length', 1);
                expect(warns[0].message.replace(/^file:\/\/[^\s]* /, ''), 'is referred to as both popular and popular.js, 'to equal', please omit the .js extension in define/require');
            })
            .run(done);
    });
    */
    it('should handle a test case with a umdish factory pattern', function (done) {
        new AssetGraph({root: __dirname + '/flattenRequireJs/umdishBackboneLocalstorage/'})
            .registerRequireJsConfig()
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
            })
            .flattenRequireJs()
            .queue(function (assetGraph) {
                assertAstsEqual(assetGraph.findAssets({fileName: /backbone-localstorage/}).pop().parseTree, function () {
                    (function (root, factory) {
                        if (typeof exports === 'object' && typeof require === 'function') {
                            module.exports = factory(require('underscore'), require('backbone'));
                        } else if (typeof define === 'function' && define.amd) {
                            // AMD. Register as an anonymous module.
                            define('backbone-localstorage', ['underscore', 'backbone'], function (_, Backbone) {
                                // Use global variables if the locals are undefined.
                                return factory(_ || root._, Backbone || root.Backbone);
                            });
                        } else {
                            // RequireJS isn't being used. Assume underscore and backbone are loaded in <script> tags
                            factory(root._, root.Backbone);
                        }
                    }(this, function (_, Backbone) {
                        return 'LOCALSTORAGE';
                    }));
                });
            })
            .run(done);
    });
});
