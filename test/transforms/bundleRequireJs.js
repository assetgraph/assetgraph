/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const _ = require('lodash');
const fs = require('fs');
const AssetGraph = require('../../lib/AssetGraph');
const mozilla = require('source-map');
const requirejs = fs.readFileSync(__dirname + '/../../testdata/transforms/bundleRequireJs/almond/mixed/require.js', 'utf8');
const almond = fs.readFileSync(__dirname + '/../../testdata/transforms/bundleRequireJs/almond/mixed/almond.js', 'utf8');

describe('transforms/bundleRequireJs', function () {
    it('should handle the jquery-require-sample test case', async function () {
        const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/jquery-require-sample/webapp/'})
            .loadAssets('app.html')
            .populate();

        expect(assetGraph, 'to contain assets', 'JavaScript', 1);

        await assetGraph.bundleRequireJs({type: 'Html'});

        const htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
        expect(htmlScripts, 'to have length', 2);
        expect(htmlScripts[0].href, 'to equal', 'scripts/require.js');
        expect(htmlScripts[1].to, 'to have the same AST as', function () {
            /* eslint-disable */
            var jquery = {};
            define('jquery', function () {});
            $.fn.alpha = function ()  {
                return this.append('<p>Alpha is Go!</p>');
            };
            define('jquery.alpha', function () {});
            $.fn.beta = function () {
                return this.append('<p>Beta is Go!</p>');
            };
            define('jquery.beta', function () {});
            require(['jquery', 'jquery.alpha', 'jquery.beta'], function ($) {
                $(function () {
                    $('body').alpha().beta();
                });
            });
            define('main',function () {});
            /* eslint-enable */
        });

        await assetGraph.serializeSourceMaps();

        expect(assetGraph, 'to contain asset', 'SourceMap');
        const sourceMap = assetGraph.findAssets({type: 'SourceMap'})[0];
        expect(sourceMap.parseTree, 'to satisfy', {
            file: '/scripts/main-bundle.js',
            sources: expect.it('to contain', '/scripts/main.js')
        });
        expect(new mozilla.SourceMapConsumer(sourceMap.parseTree).originalPositionFor({
            line: 6,
            column: 10
        }), 'to satisfy', {
            source: '/scripts/jquery.alpha.js',
            line: 2,
            column: 0 // Not quite right?
        });
    });

    it('should handle a test case with a text dependency', async function () {
        const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/textDependency/'})
            .loadAssets('index.html')
            .populate()
            .bundleRequireJs({type: 'Html'})
            .populate({from: { type: 'JavaScript'}});

        const htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
        expect(htmlScripts, 'to have length', 2);
        expect(htmlScripts[0].href, 'to equal', 'require.js');
    });

    it('should handle a test case with a module that has multiple define calls pointing at it', async function () {
        const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/multipleIncoming/'})
            .loadAssets('index.html')
            .populate();

        expect(assetGraph, 'to contain asset', 'JavaScript');

        await assetGraph.bundleRequireJs({type: 'Html'});

        const htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
        expect(htmlScripts, 'to have length', 2);
        expect(htmlScripts[0].href, 'to equal', 'require.js');
        expect(htmlScripts[1].to.parseTree, 'to have the same AST as', function () {
            define('popular', [], function () {
                alert('I\'m a popular helper module');
                return 'foo';
            });
            define('module1', ['popular'], function () {
                return 'module1';
            });
            define('module2', ['popular'], function () {
                return 'module2';
            });
            require([
                'module1',
                'module2'
            ], function (module1, module2) {
                alert('Got it all!');
            });
            define('main', function () {});
        });
    });

    it('should handle another case with a module that has multiple define calls pointing at it', async function () {
        const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/multipleIncoming2/'})
            .loadAssets('index.html')
            .populate()
            .bundleRequireJs({type: 'Html'});
        const htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});

        expect(htmlScripts, 'to have length', 2);
        expect(htmlScripts[0].href, 'to equal', 'require.js');
        expect(htmlScripts[1].to.parseTree, 'to have the same AST as', function () {
            define('module2', [], function () {
                return 'module2';
            });
            define('module1', ['module2'], function () {
                return 'module1';
            });
            require([
                'module1',
                'module2'
            ], function (module1, module2) {
                alert('Got it all!');
            });
            define('main', function () {});
        });
    });

    it('should handle a test case with a module that is included via a script tag and a JavaScriptAmdRequire relation', async function () {
        const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/nonOrphanedJavaScript/'})
            .loadAssets('index.html')
            .populate()
            .bundleRequireJs({type: 'Html'});
        const htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});

        expect(htmlScripts, 'to have length', 3);
        expect(htmlScripts[0].href, 'to equal', 'includedInHtmlAndViaRequire.js');
        expect(htmlScripts[1].href, 'to equal', 'require.js');
        expect(htmlScripts[2].to.parseTree, 'to have the same AST as', function () {
            alert('includedInHtmlAndViaRequire.js');
            define('includedInHtmlAndViaRequire', function () {
            });
            require(['includedInHtmlAndViaRequire'], function (foo) {
                alert('Here we are!');
            });
            define('main', function () {});
        });
    });

    it('should handle a test case that uses require(...) to fetch a css file', async function () {
        const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/cssRequire/'})
            .loadAssets('index.html')
            .populate();
        expect(assetGraph, 'to contain assets', 'JavaScript', 2);

        await assetGraph
            .bundleRequireJs({type: 'Html'})
            .populate();

        expect(assetGraph, 'to contain relation', 'HtmlStyle');
        expect(assetGraph, 'to contain asset', 'Css');
        expect(assetGraph, 'to contain relation', 'CssImage');
        expect(assetGraph, 'to contain asset', 'Png');
    });

    it('should handle a test case that includes a JavaScriptStaticUrl relation', async function () {
        const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/withOneStaticUrl/'})
            .loadAssets('index.html')
            .populate();


        expect(assetGraph, 'to contain assets', 'JavaScript', 1);

        await assetGraph
            .bundleRequireJs({type: 'Html'})
            .populate();

        expect(assetGraph, 'to contain relation', 'JavaScriptStaticUrl');
        expect(assetGraph, 'to contain asset', 'Png');

        const htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
        expect(htmlScripts, 'to have length', 2);
        expect(htmlScripts[0].to.url, 'to match', /\/require\.js$/);

        expect(htmlScripts[1].to.parseTree, 'to have the same AST as', function () {
            /* eslint-disable */
            define('module2', [], function () {
                return 'foo.png'.toString('url');
            });
            define('module1', ['module2'], function () {
                return 'module1';
            });
            define('module3', [], function () {
                alert('module3.js');
            });
            require([
                'module1',
                'module2',
                'module3'
            ], function (module1, module2, module3) {
                alert('Got it all');
            });
            define('main', function () {});
            /* eslint-enable */
        });
    });

    it('should handle a umd test case', async function () {
        const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/umd/'})
            .loadAssets('index.html')
            .populate()
            .bundleRequireJs({type: 'Html'});
        const htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});

        expect(htmlScripts, 'to have length', 2);
        expect(htmlScripts[0].to.url, 'to match', /\/require\.js$/);

        expect(htmlScripts[1].to.parseTree, 'to have the same AST as', function () {
            /* eslint-disable */
            (function (root, factory) {
                if (typeof module !== 'undefined') {
                    module.exports = factory();
                } else if (typeof root.define === 'function' && define.amd) {
                    define('myumdmodule', factory);
                } else {
                    root.myModule = factory();
                }
            }(this, function () {
                return true;
            }));
            require(['myumdmodule'], function (myUmdModule) {
                alert(myUmdModule);
            });
            define('main', function () {
            });
            /* eslint-enable */
        });
    });

    it('should handle a umd test case where the wrapper has a dependency in the define call', async function () {
        const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/umdWithDependency/'})
            .loadAssets('index.html')
            .populate()
            .bundleRequireJs({type: 'Html'});
        const htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});

        expect(htmlScripts, 'to have length', 2);
        expect(htmlScripts[0].href, 'to equal', 'require.js');
        expect(htmlScripts[1].to.parseTree, 'to have the same AST as', function () {
            /* eslint-disable */
            define('someDependency', [], function () {
                alert('got the dependency!');
            });
            (function (root, factory) {
                if (typeof module !== 'undefined') {
                    module.exports = factory();
                } else if (typeof root.define === 'function' && define.amd) {
                    define('myumdmodule', ['someDependency'], factory);
                } else {
                    root.myModule = factory();
                }
            }(this, function (someDependency) {
                return true;
            }));
            require(['myumdmodule'], function (myUmdModule) {
                alert(myUmdModule);
            });
            define('main', function () {
            });
            /* eslint-enable */
        });
    });

    it('should handle a non-umd test case', async function () {
        const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/nonUmd/'})
            .loadAssets('index.html')
            .populate()
            .bundleRequireJs({type: 'Html'});
        const htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});

        expect(htmlScripts, 'to have length', 2);
        expect(htmlScripts[0].href, 'to equal', 'require.js');
        expect(htmlScripts[1].to.parseTree, 'to have the same AST as', function () {
            /* eslint-disable */
            (function (global) {
                var signals = function () {
                    return true;
                };
                if (typeof define === 'function' && define.amd) {
                    define('signals', [], function () {
                        return signals;
                    });
                } else if (typeof module !== 'undefined' && module.exports) {
                    module.exports = signals;
                } else {
                    global['signals'] = signals;
                }
            }(this));
            require(['signals'], function (myUmdModule) {
                alert(signals);
            });
            define('main', function () {
            });
            /* eslint-enable */
        });
    });

    it('should handle a test case with multiple Html files depending on the same modules', async function () {
        const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/multipleHtmls/'})
            .loadAssets('*.html')
            .populate()
            .bundleRequireJs({type: 'Html'});
        const htmlScripts1 = assetGraph.findRelations({type: 'HtmlScript', from: {url: /\/index1\.html$/}});

        expect(htmlScripts1, 'to have length', 2);
        expect(htmlScripts1[1].to.parseTree, 'to have the same AST as', function () {
            /* eslint-disable */
            define('someDependency', [], function () {
                alert('here is the dependency of the common module');
            });
            define('commonModule', ['someDependency'], function () {
                alert('here is the common module');
            });
            require(['commonModule'], function (commonModule) {
                alert('here we are in app1!');
            });
            define('app1', function () {});
            /* eslint-enable */
        });

        const htmlScripts2 = assetGraph.findRelations({type: 'HtmlScript', from: {url: /\/index2\.html$/}});
        expect(htmlScripts2, 'to have length', 2);
        expect(htmlScripts2[1].to.parseTree, 'to have the same AST as', function () {
            /* eslint-disable */
            define('someDependency', [], function () {
                alert('here is the dependency of the common module');
            });
            define('commonModule', ['someDependency'], function () {
                alert('here is the common module');
            });
            require(['commonModule'], function (commonModule) {
                alert('here we are in app2!');
            });
            define('app2', function () {});
            /* eslint-enable */
        });
    });

    it('should handle a test case using the less! plugin', async function () {
        const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/lessPlugin/'})
            .loadAssets('index*.html')
            .populate()
            .bundleRequireJs({type: 'Html'});

        expect(_.map(assetGraph.findRelations({type: 'HtmlStyle', from: {url: /\/index\.html$/}}), 'href'), 'to equal', [
            'main-bundle.css'
        ]);
        expect(_.map(assetGraph.findRelations({type: 'HtmlStyle', from: {url: /\/index2\.html$/}}), 'href'), 'to equal', [
            'main2-bundle.css'
        ]);
    });

    it('should handle a test case with a shims config', async function () {
        const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/shim/'})
            .loadAssets('index.html')
            .populate()
            .bundleRequireJs();
        const htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});

        expect(htmlScripts, 'to have length', 3);
        expect(htmlScripts[0].to.text, 'to match', /var require\s*=/);
        expect(htmlScripts[1].to.url, 'to match', /\/require\.js$/);

        expect(htmlScripts[2].to.parseTree, 'to have the same AST as', function () {
            /* eslint-disable */
            alert('someDependency');
            define('someDependency', function () {
            });
            alert('nonAmdModule1');
            define('nonAmdModule1', ['someDependency'], function () {
            });
            alert('someOtherDependency');
            define('someOtherDependency', function () {
            });
            alert('nonAmdModule2');
            window.foo = { bar: 'foo dot bar' };
            define('nonAmdModule2', ['someOtherDependency'], function (global) {
                return function () {
                    var ret, fn;
                    return ret || global.foo.bar;
                };
            }(this));
            require([
                'nonAmdModule1',
                'nonAmdModule2'
            ], function (nonAmdModule1, nonAmdModule2) {
                alert('Got \'em all!');
            });
            define('main', function () {});
            /* eslint-enable */
        });
    });

    it('should handle a test case with a non-string items in the require array', async function () {
        const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/nonString/'})
            .loadAssets('index.html')
            .populate();

        expect(_.map(assetGraph.findAssets({type: 'JavaScript'}), 'url').sort(), 'to equal', [
            assetGraph.root + 'require.js'
        ]);

        await assetGraph.bundleRequireJs({type: 'Html'});

        const htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
        expect(htmlScripts[1].to.parseTree, 'to have the same AST as', function () {
            /* eslint-disable */
            require([
                'some' + 'thing',
                foo ? 'bar' : 'quux'
            ], function (something, barOrQuux) {
                alert('Got something!');
            });
            define('main', function () {});
            /* eslint-enable */
        });
    });

    it('should handle a test case with relative dependencies', async function () {
        const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/relativeDependencies/'})
            .loadAssets('index.html')
            .populate();

        expect(_.map(assetGraph.findAssets({type: 'JavaScript'}), 'url').sort(), 'to equal', [
            assetGraph.root + 'require.js'
        ]);

        await assetGraph.bundleRequireJs({type: 'Html'});

        const htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
        expect(htmlScripts, 'to have length', 2);

        expect(htmlScripts[0].to.url, 'to match', /\/require\.js$/);
        expect(htmlScripts[1].to.parseTree, 'to have the same AST as', function () {
            /* eslint-disable */
            define('subdir/subsubdir/quux', [], function () {
                alert('quux!');
            });
            define('subdir/bar', ['./subsubdir/quux'], function (quux) {
                alert('bar!');
            });
            define('subdir/foo', [
                './bar',
                './subsubdir/quux'
            ], function (bar) {
                alert('foo!');
            });
            require(['subdir/foo'], function (foo) {
                alert('Got \'em all!');
            });
            define('main', function () {});
            /* eslint-enable */
        });
    });

    // This test isn't that interesting as the require.js optimizer leaves the asset on the CDN:
    it('should handle a test case with a paths config that points jquery at a CDN', async function () {
        const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/httpPath/'})
            .loadAssets('index.html')
            .populate();

        expect(_.map(assetGraph.findAssets({type: 'JavaScript', isInline: false}), 'url').sort(), 'to equal', [
            assetGraph.root + 'require.js'
        ]);

        await assetGraph.bundleRequireJs();

        const htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
        expect(htmlScripts[2].to.parseTree, 'to have the same AST as', function () {
            /* eslint-disable */
            require(['jquery'], function ($) {
                $(function () {
                    alert('Ready!');
                });
            });
            define('main', function () {});
            /* eslint-enable */
        });
    });

    it('should handle a test case with a paths config that maps theLibrary to 3rdparty/theLibrary', async function () {
        const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/paths/'})
            .loadAssets('index.html')
            .populate()
            .bundleRequireJs();
        const htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});

        expect(htmlScripts, 'to have length', 3);
        expect(htmlScripts[1].to.url, 'to match', /\/require\.js$/);

        expect(htmlScripts[2].to.parseTree, 'to have the same AST as', function () {
            /* eslint-disable */
            define('theLibrary', [], function () {
                return 'the contents of theLibrary';
            });
            define('subdir/bar', [], function () {
                return 'bar';
            });
            define('subdir/foo', ['./bar'], function (bar) {
                alert('Got bar: ' + bar);
                return {};
            });
            require([
                'theLibrary',
                'subdir/foo'
            ], function (theLibrary) {
                alert('Got the library: ' + theLibrary);
            });
            define('main', function () {
            });
            /* eslint-enable */
        });
    });

    it('should handle a test case with a data-main that only contains a define (#127)', async function () {
        const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/issue127/'})
            .loadAssets('index.html')
            .populate()
            .bundleRequireJs();

        var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
        expect(htmlScripts, 'to have length', 2);
        expect(htmlScripts[0].href, 'to equal', 'require.js');
        expect(htmlScripts[1].to.parseTree, 'to have the same AST as', function () {
            /* eslint-disable */
            define('main', [], function () {
                alert('It gets lonely in here if nobody runs me');
            });
            /* eslint-enable */
        });
    });

    /*
    // This is a common mistake that require.js tolerates, although it does have the side effect that the module definition
    // function is run twice. This test case asserts that bundleRequireJs emits an error as the build will be broken.
    it('should handle a test case with a module that is referred to both with and without the .js extension', function (done) {
        var warns = [];
        new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/multipleIncomingWithAndWithoutDotJsSuffix/'})
            .on('warn', function (err) {
                warns.push(err);
            })
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(warns, 'to have length', 0);
                expect(assetGraph, 'to contain assets', 'JavaScript', 5);
            })
            .bundleRequireJs()
            .queue(function (assetGraph) {
                expect(warns, 'This test has failed once in a random manner. If you see this again expect it to be a race condition', 'to be ok');
                expect(warns, 'to have length', 1);
                expect(warns[0].message.replace(/^file:\/\/[^\s]* /, ''), 'is referred to as both popular and popular.js, 'to equal', please omit the .js extension in define/require');
            });
    });
    */
    it('should handle a test case with a umdish factory pattern', async function () {
        const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/umdishBackboneLocalstorage/'})
            .loadAssets('index.html')
            .populate()
            .bundleRequireJs();

        expect(assetGraph.findRelations({type: 'HtmlScript'})[1].to.parseTree, 'to have the same AST as', function () {
            /* eslint-disable */
            (function (root) {
                root._ = 'UNDERSCORE';
            }(this));
            define('underscore', function () {
            });
            (function (root) {
                root.Backbone = 'BACKBONE';
            }(this));
            define('backbone', function () {
            });
            (function (root, factory) {
                if (typeof exports === 'object' && typeof require === 'function') {
                    module.exports = factory(require('underscore'), require('backbone'));
                } else if (typeof define === 'function' && define.amd) {
                    define('backbone-localstorage', [
                        'underscore',
                        'backbone'
                    ], function (_, Backbone) {
                        return factory(_ || root._, Backbone || root.Backbone);
                    });
                } else {
                    factory(root._, root.Backbone);
                }
            }(this, function (_, Backbone) {
                return 'LOCALSTORAGE';
            }));
            require(['backbone-localstorage'], function (bbls) {
                alert(bbls);
            });
            define('main', function () {
            });
            /* eslint-enable */
        });
    });

    describe('with a data-almond attribute', function () {
        it('should handle a non-almond test case', async function () {
            const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/almond/mixed/'})
                .loadAssets('require-pure.html')
                .populate({from: {type: 'Html'}, followRelations: {type: 'HtmlScript', to: {url: /^file:/}}})
                .populate();

            expect(assetGraph, 'to contain asset', 'JavaScript');
            expect(assetGraph.findAssets({type: 'JavaScript'}).pop().text, 'to equal', requirejs);

            await assetGraph.bundleRequireJs();

            expect(assetGraph, 'to contain asset', 'JavaScript');
            expect(assetGraph.findAssets({type: 'JavaScript'}).pop().text, 'to equal', requirejs);
        });

        it('should handle a test case with several data-almond attributes', async function () {
            const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/almond/mixed/'})
                .loadAssets('require-almond.html')
                .populate({from: {type: 'Html'}, followRelations: {type: 'HtmlScript', to: {url: /^file:/}}})
                .populate();

            expect(assetGraph, 'to contain asset', 'JavaScript');
            expect(assetGraph, 'to contain relations', 'HtmlScript', 2);

            expect(assetGraph.findRelations({type: 'HtmlScript'})[0].to.text, 'to equal', requirejs);

            await assetGraph
                .bundleRequireJs()
                .populate();

            expect(assetGraph, 'to contain assets', 'JavaScript', 3);
            expect(assetGraph, 'to contain relations', 'HtmlScript', 4);

            expect(assetGraph.findAssets({url: /almond.js$/})[0].text, 'to equal', almond);
        });

        it('should handle a test case where multiple Html assets use the same require.js and have a data-almond attribute', async function () {
            const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/transforms/bundleRequireJs/almond/multipleHtml/'})
                .loadAssets('*.html')
                .populate({from: {type: 'Html'}, followRelations: {type: 'HtmlScript', to: {url: /^file:/}}})
                .populate();

            expect(assetGraph, 'to contain assets', 'Html', 2);
            expect(assetGraph, 'to contain assets', 'JavaScript', 1);
            expect(assetGraph, 'to contain relations', 'HtmlScript', 2);

            await assetGraph.bundleRequireJs();

            expect(assetGraph, 'to contain asset', 'JavaScript');
            expect(assetGraph, 'to contain relations', 'HtmlScript', 2);
            assetGraph.findAssets({type: 'Html'}).forEach(function (htmlAsset) {
                expect(htmlAsset.text.match(/<script/g), 'to have length', 1);
            });
        });
    });
});
