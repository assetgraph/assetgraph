var vows = require('vows'),
    assert = require('assert'),
    _ = require('underscore'),
    fs = require('fs'),
    path = require('path'),
    AssetGraph = require('../lib/AssetGraph'),
    uglifyJs = AssetGraph.JavaScript.uglifyJs,
    uglifyAst = AssetGraph.JavaScript.uglifyAst;

vows.describe('transforms.bundleRequireJs').addBatch({
    'After loading the jquery-require-sample test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/bundleRequireJs/jquery-require-sample/webapp/'})
                .registerRequireJsConfig()
                .loadAssets('app.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 6 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 6);
        },
        'the graph should contain 1 HtmlRequireJsMain relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlRequireJsMain'}).length, 1);
        },
        'the graph should contain 5 JavaScript assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 5);
        },
        'then running the bundleRequireJs transform': {
            topic: function (assetGraph) {
                assetGraph.bundleRequireJs({type: 'Html'}).run(this.callback);
            },
            'the graph should contain 2 JavaScript loaded assets (jquery.js does not exist)': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'JavaScript', isLoaded: true}).length, 2);
            },
            'main.js should be identical to the output of the require.js optimizer': function (assetGraph) {
                var requireJsOptimizerOutputAst = uglifyJs.parse(fs.readFileSync(path.resolve(__dirname, 'bundleRequireJs/jquery-require-sample/webapp-build/scripts/main.js'), 'utf-8'));
                assert.equal(assetGraph.findAssets({type: 'JavaScript', url: /\/main\.js$/})[0].parseTree.print_to_string(),
                             requireJsOptimizerOutputAst.print_to_string());
            }
        }
    },
    'After loading test case with a text dependency': {
        topic: function () {
            new AssetGraph({root: __dirname + '/bundleRequireJs/textDependency/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 2 JavaScript assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 2);
        },
        'the graph should contain 1 non-inline Text asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Text', isInline: false}).length, 1);
        },
        'then running the bundleRequireJs transform': {
            topic: function (assetGraph) {
                assetGraph.bundleRequireJs({type: 'Html'}).run(this.callback);
            },
            'the graph should contain 2 JavaScript assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 2);
            },
            'the graph should contain GETTEXT relation pointing at myTextFile.txt': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'JavaScriptGetText', to: {url: /\/myTextFile\.txt$/}}).length, 1);
            },
            'the resulting main.js should have a define("myTextFile.txt") and the "text!" prefix should be stripped from the require list': function (assetGraph) {
                assert.equal(assetGraph.findAssets({url: /\/main\.js$/})[0].text,
                             'define("myTextFile.txt",GETTEXT("myTextFile.txt"));require(["myTextFile.txt"],function(contentsOfMyTextFile){alert(contentsOfMyTextFile+", yay!")});define("main",function(){});'
                );
            },
            'then inline the JavaScriptGetText relations': {
                topic: function (assetGraph) {
                    assetGraph.inlineRelations({type: 'JavaScriptGetText'}).run(this.callback);
                },
                'main.js should should contain the contents of myTextFile.txt': function (assetGraph) {
                    assert.equal(assetGraph.findAssets({url: /\/main\.js$/})[0].text,
                                'define("myTextFile.txt","THE TEXT!\\n");require(["myTextFile.txt"],function(contentsOfMyTextFile){alert(contentsOfMyTextFile+", yay!")});define("main",function(){});'
                    );
                }
            }
        }
    },
    'After loading test case with a module that has multiple incoming JavaScriptAmd* relations': {
        topic: function () {
            new AssetGraph({root: __dirname + '/bundleRequireJs/multipleIncoming/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 5 JavaScript assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 5);
        },
        'then running the bundleRequireJs transform': {
            topic: function (assetGraph) {
                assetGraph.bundleRequireJs({type: 'Html'}).run(this.callback);
            },
            'the graph should contain 2 JavaScript assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 2);
            },
            'the resulting main.js should have the expected parse tree': function (assetGraph) {
                assert.equal(assetGraph.findAssets({url: /\/main\.js$/})[0].parseTree.print_to_string(),
                             uglifyJs.parse(function () {
                                 define("popular", function(){
                                     alert("I\'m a popular helper module");
                                     return "foo";
                                 });
                                 define("module1", ["popular"], function () {
                                     return"module1";
                                 });
                                 define("module2", ["popular"], function () {
                                     return"module2";
                                 });
                                 require(["module1", "module2"], function (module1, module2) {
                                     alert("Got it all!");
                                 });
                                 define("main", function () {});
                             }.toString().replace(/^function[^\(]*?\(\)\s*\{|}$/g, '')).print_to_string()
                );
            }
        }
    },
    'After loading a slightly different test case with a module that has multiple incoming JavaScriptAmd* relations': {
        topic: function () {
            new AssetGraph({root: __dirname + '/bundleRequireJs/multipleIncoming2/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 4 JavaScript assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 4);
        },
        'then running the bundleRequireJs transform': {
            topic: function (assetGraph) {
                assetGraph.bundleRequireJs({type: 'Html'}).run(this.callback);
            },
            'the graph should contain 2 JavaScript assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 2);
            },
            'the resulting main.js should have the expected contents': function (assetGraph) {
                assert.equal(assetGraph.findAssets({url: /\/main\.js$/})[0].text,
	                         'define("module2",[],function(){return"module2"});define("module1",["module2"],function(){return"module1"});require(["module1","module2"],function(module1,module2){alert("Got it all!")});define("main",function(){});'
                );
            }
        }
    },
    'After loading test case with a module that is included via a script tag and a JavaScriptAmdRequire relation': {
        topic: function () {
            new AssetGraph({root: __dirname + '/bundleRequireJs/nonOrphanedJavaScript/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 3 JavaScript assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 3);
        },
        'the graph should still contain 2 HtmlScript relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlScript'}).length, 2);
        },
        'then running the bundleRequireJs transform': {
            topic: function (assetGraph) {
                assetGraph.bundleRequireJs({type: 'Html'}).run(this.callback);
            },
            'the graph should still contain 3 JavaScript assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 3);
            },
            'the graph should still contain 2 HtmlScript relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlScript'}).length, 2);
            },
            'the resulting main.js should have the expected contents': function (assetGraph) {
                assert.equal(assetGraph.findAssets({url: /\/main\.js$/})[0].text,
                             'alert("includedInHtmlAndViaRequire.js");define("includedInHtmlAndViaRequire",function(){});require(["includedInHtmlAndViaRequire"],function(foo){alert("Here we are!")});define("main",function(){});'
                );
            }
        }
    },
    'After loading test case that uses require(...) in a regular <script>': {
        topic: function () {
            new AssetGraph({root: __dirname + '/bundleRequireJs/withoutHtmlRequireJsMain/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 5 JavaScript assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 5);
        },
        'then running the bundleRequireJs transform': {
            topic: function (assetGraph) {
                assetGraph.bundleRequireJs({type: 'Html'}).run(this.callback);
            },
            'the graph should contain 2 JavaScript assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 2);
            },
            'the resulting inline script should have the expected contents': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'JavaScript', isInline: true})[0].text,
                             'define("popular",function(){alert("I\'m a popular helper module");return"foo"});define("module1",["popular"],function(){return"module1"});define("module2",["popular"],function(){return"module2"});require(["module1","module2"],function(){alert("Got it all!")});'
                );
            }
        }
    },
    'After loading test case that uses require(...) to fetch a css file': {
        topic: function () {
            new AssetGraph({root: __dirname + '/bundleRequireJs/cssRequire/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 2 JavaScript assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 2);
        },
        'the graph should contain 1 JavaScriptAmdRequire relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'JavaScriptAmdRequire'}).length, 1);
        },
        'the graph should contain 1 Css asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Css'}).length, 1);
        },
        'the graph should contain 1 CssImage relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'CssImage'}).length, 1);
        },
        'the graph should contain 1 Png asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Png'}).length, 1);
        },
        'then running the bundleRequireJs transform': {
            topic: function (assetGraph) {
                assetGraph.bundleRequireJs({type: 'Html'}).run(this.callback);
            },
            'the graph should contain 2 JavaScript assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 2);
            },
            'the graph should contain no JavaScriptAmdRequire relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'JavaScriptAmdRequire'}).length, 0);
            },
            'the graph should contain 1 HtmlStyle relation': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlStyle'}).length, 1);
            },
            'the graph should contain 1 Css asset': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'Css'}).length, 1);
            },
            'the graph should contain 1 CssImage relation': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'CssImage'}).length, 1);
            },
            'the graph should contain 1 Png asset': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'Png'}).length, 1);
            }
        }
    },
    'After loading test case that includes a GETSTATICURL relation': {
        topic: function () {
            new AssetGraph({root: __dirname + '/bundleRequireJs/withOneGetStaticUrl/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 5 JavaScript assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 5);
        },
        'the graph should contain 1 JavaScriptGetStaticUrl relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'JavaScriptGetStaticUrl'}).length, 1);
        },
        'the graph should contain 1 StaticUrlMapEntry relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'StaticUrlMapEntry'}).length, 1);
        },
        'the graph should contain 1 Png asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Png'}).length, 1);
        },
        'then running the bundleRequireJs transform': {
            topic: function (assetGraph) {
                assetGraph.bundleRequireJs({type: 'Html'}).run(this.callback);
            },
            'the graph should contain 2 JavaScript assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 2);
            },
            'the graph should contain 1 JavaScriptGetStaticUrl relation': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'JavaScriptGetStaticUrl'}).length, 1);
            },
            'the graph should contain 1 StaticUrlMapEntry relation': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'StaticUrlMapEntry'}).length, 1);
            },
            'the graph should contain 1 Png asset': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'Png'}).length, 1);
            },
            'the resulting main script should have the expected contents': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'JavaScript', url: /\/main\.js$/})[0].text,
                             'define("module2",function(){return"module2, who\'s my url?"+GETSTATICURL("foo.png")});define("module1",["module2"],function(){return"module1"});define("module3",function(){alert("module3.js")});require(["module1","module2","module3"],function(module1,module2,module3){alert("Got it all")});define("main",function(){});'
                );
            }

        }
    },
    'After loading the umd test case and running the bundleRequireJs transform': {
        topic: function () {
            new AssetGraph({root: __dirname + '/bundleRequireJs/umd/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .bundleRequireJs({type: 'Html'})
                .run(this.callback);
        },
        'the bundled main script should have the expected contents': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlRequireJsMain'})[0].to.parseTree.print_to_string(),
                         uglifyJs.parse(function () {
                             define("myumdmodule", function () {
                                 return true;
                             });

                             require(['myumdmodule'], function (myUmdModule) {
                                 alert(myUmdModule);
                             });

                             define("main", function () {});
                         }.toString().replace(/^function[^\(]*?\(\)\s*\{|}$/g, '')).print_to_string());
        }
    },
    'After loading the umd test case where the wrapper has a dependency in the define call, then running the bundleRequireJs transform': {
        topic: function () {
            new AssetGraph({root: __dirname + '/bundleRequireJs/umdWithDependency/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .bundleRequireJs({type: 'Html'})
                .run(this.callback);
        },
        'the bundled main script should have the expected contents': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlRequireJsMain'})[0].to.parseTree.print_to_string(),
                         uglifyJs.parse(function () {
                             define("someDependency", function (){
                                 alert("got the dependency!");
                             });

                             define("myumdmodule", ["someDependency"], function (someDependency) {
                                 return true;
                             });

                             require(['myumdmodule'], function (myUmdModule) {
                                 alert(myUmdModule);
                             });

                             define("main",function(){});
                         }.toString().replace(/^function[^\(]*?\(\)\s*\{|}$/g, '')).print_to_string());
        }
    },
    'After loading the non-umd test case and running the bundleRequireJs transform': {
        topic: function () {
            new AssetGraph({root: __dirname + '/bundleRequireJs/nonUmd/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .bundleRequireJs({type: 'Html'})
                .run(this.callback);
        },
        'the bundled main script should have the expected contents': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlRequireJsMain'})[0].to.parseTree.print_to_string(),
                         uglifyJs.parse(function () {
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

                             require(['signals'], function (myUmdModule) {
                                 alert(signals);
                             });

                             define("main",function(){});
                         }.toString().replace(/^function[^\(]*?\(\)\s*\{|}$/g, '')).print_to_string());
        }
    },
    'After loading a test case with multiple Html files depending on the same modules, then running the bundleRequireJs transform': {
        topic: function () {
            new AssetGraph({root: __dirname + '/bundleRequireJs/multipleHtmls/'})
                .registerRequireJsConfig()
                .loadAssets('*.html')
                .populate()
                .bundleRequireJs({type: 'Html'})
                .run(this.callback);
        },
        'app1.js should include the someDependency define': function (assetGraph) {
            assert.matches(assetGraph.findAssets({url: /\/app1.js$/})[0].text, /define\(['"]someDependency/);
        },
        'app1.js should include the commonModule define': function (assetGraph) {
            assert.matches(assetGraph.findAssets({url: /\/app1.js$/})[0].text, /define\(['"]commonModule/);
        },
        'app2.js should include the someDependency define': function (assetGraph) {
            assert.matches(assetGraph.findAssets({url: /\/app2.js$/})[0].text, /define\(['"]someDependency/);
        },
        'app2.js should include the commonModule define': function (assetGraph) {
            assert.matches(assetGraph.findAssets({url: /\/app2.js$/})[0].text, /define\(['"]commonModule/);
        }
    },
    'After loading a test case using the less! plugin, then running the bundleRequireJs transform': {
        topic: function () {
            new AssetGraph({root: __dirname + '/bundleRequireJs/lessPlugin/'})
                .registerRequireJsConfig()
                .loadAssets('index*.html')
                .populate()
                .bundleRequireJs({type: 'Html'})
                .run(this.callback);
        },
        'index.html should have a HtmlStyle relations pointing at the Less assets': function (assetGraph) {
            assert.deepEqual(_.pluck(assetGraph.findRelations({type: 'HtmlStyle', from: {url: /\/index\.html$/}}), 'href'), [
                'b.less',
                'a.less',
                'c.less'
            ]);
        },
        'index2.html should have a HtmlStyle relations pointing at the Less assets': function (assetGraph) {
            assert.deepEqual(_.pluck(assetGraph.findRelations({type: 'HtmlStyle', from: {url: /\/index2\.html$/}}), 'href'), [
                'b.less',
                'a.less',
                'c.less'
            ]);
        }
    },
    'After running the registerRequireJsConfig transform, then loading a test case with shims config': {
        topic: function () {
            new AssetGraph({root: __dirname + '/bundleRequireJs/shim/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .run(this.callback);
        },
        'asset.requireJsConfig.shim should have the expected value': function (assetGraph) {
            assert.deepEqual(assetGraph.requireJsConfig.shim, {
                nonAmdModule1: {deps: ['someDependency']},
                nonAmdModule2: {exports: 'foo.bar', deps: ['someOtherDependency']}
            });
        },
        'then populate the graph': {
            topic: function (assetGraph) {
                assetGraph.populate().run(this.callback);
            },
            'the graph should contain 2 JavaScriptShimRequire relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'JavaScriptShimRequire'}).length, 2);
            },
            'then run the bundleRequireJs transform': {
                topic: function (assetGraph) {
                    assetGraph.bundleRequireJs().run(this.callback);
                },
                'the resulting main script should have the expected contents': function (assetGraph) {
                    assert.equal(assetGraph.findRelations({type: 'HtmlRequireJsMain'})[0].to.parseTree.print_to_string(),
                                 uglifyJs.parse(function () {
                                     alert('someDependency');
                                     define('someDependency', function () {});

                                     alert('nonAmdModule1');
                                     define('nonAmdModule1', function () {});

                                     alert('someOtherDependency');
                                     define('someOtherDependency', function () {});

                                     alert('nonAmdModule2');
                                     window.foo = {bar: 'foo dot bar'};
                                     define('nonAmdModule2', function () {return foo.bar;});

                                     require(['nonAmdModule1', 'nonAmdModule2'], function (nonAmdModule1, nonAmdModule2) {
                                         alert("Got 'em all!");
                                     });
                                     define('main', function () {});
                                 }.toString().replace(/^function[^\(]*?\(\)\s*\{|}$/g, '')).print_to_string());
                }
            }
        }
    },
    'After loading a test case with a non-string items in the require array': {
        topic: function () {
            new AssetGraph({root: __dirname + '/bundleRequireJs/nonString/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 3 JavaScript assets with the expected urls': function (assetGraph) {
            assert.deepEqual(_.pluck(assetGraph.findAssets({type: 'JavaScript'}), 'url').sort(), [
                assetGraph.root + 'main.js',
                assetGraph.root + 'require.js',
                assetGraph.root + 'something.js'
            ]);
        },
        'then run the bundleRequireJs transform': {
            topic: function (assetGraph) {
                assetGraph
                    .bundleRequireJs({type: 'Html'})
                    .run(this.callback);
            },
            'the graph should contain 2 JavaScript assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 2);
            }
        }
    },
    'After loading a test case with a relative dependencies': {
        topic: function () {
            new AssetGraph({root: __dirname + '/bundleRequireJs/relativeDependencies/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 4 JavaScript assets with the expected urls': function (assetGraph) {
            assert.deepEqual(_.pluck(assetGraph.findAssets({type: 'JavaScript'}), 'url').sort(), [
                assetGraph.root + 'main.js',
                assetGraph.root + 'require.js',
                assetGraph.root + 'subdir/bar.js',
                assetGraph.root + 'subdir/foo.js',
                assetGraph.root + 'subdir/subsubdir/quux.js'
            ]);
        },
        'then run the bundleRequireJs transform': {
            topic: function (assetGraph) {
                assetGraph
                    .bundleRequireJs({type: 'Html'})
                    .run(this.callback);
            },
            'the graph should contain 2 JavaScript assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 2);
            },
            'the bundled JavaScript should have the expected contents': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlRequireJsMain'})[0].to.parseTree.print_to_string(),
                             uglifyJs.parse(function () {
                                 define("subdir/subsubdir/quux", function () {
                                     alert("quux!");
                                 });

                                 define("subdir/bar", ["./subsubdir/quux"], function (quux) {
                                     alert("bar!");
                                 });

                                 define("subdir/foo", ["./bar", "./subsubdir/quux"], function (bar) {
                                     alert("foo!");
                                 });

                                 require(["subdir/foo"], function (foo) {
                                     alert("Got 'em all!");
                                 });

                                 define("main", function () {});
                             }.toString().replace(/^function[^\(]*?\(\)\s*\{|}$/g, '')).print_to_string());
            }
        }
    },
    'After loading a test case with a relative dependencies once again': {
        topic: function () {
            new AssetGraph({root: __dirname + '/bundleRequireJs/relativeDependencies/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 4 JavaScript assets with the expected urls': function (assetGraph) {
            assert.deepEqual(_.pluck(assetGraph.findAssets({type: 'JavaScript'}), 'url').sort(), [
                assetGraph.root + 'main.js',
                assetGraph.root + 'require.js',
                assetGraph.root + 'subdir/bar.js',
                assetGraph.root + 'subdir/foo.js',
                assetGraph.root + 'subdir/subsubdir/quux.js'
            ]);
        },
        'then move quux.js and run the bundleRequireJs transform': {
            topic: function (assetGraph) {
                var quuxJs = assetGraph.findAssets({url: /\/quux\.js/})[0];
                quuxJs.url = quuxJs.url.replace(/subsubdir/, 'othersubdir');
                assetGraph
                    .bundleRequireJs({type: 'Html'})
                    .run(this.callback);
            },
            'the graph should contain 2 JavaScript assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 2);
            },
            'the bundled JavaScript should have the expected contents': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlRequireJsMain'})[0].to.parseTree.print_to_string(),
                             uglifyJs.parse(function () {
                                 define("subdir/othersubdir/quux", function () {
                                     alert("quux!");
                                 });

                                 define("subdir/bar", ["./othersubdir/quux"], function (quux) {
                                     alert("bar!");
                                 });

                                 define("subdir/foo", ["./bar", "./othersubdir/quux"], function (bar) {
                                     alert("foo!");
                                 });

                                 require(["subdir/foo"], function (foo) {
                                     alert("Got 'em all!");
                                 });

                                 define("main", function () {});
                             }.toString().replace(/^function[^\(]*?\(\)\s*\{|}$/g, '')).print_to_string());
            }
        }
    },
    'After loading a test case with a paths config that points jquery at a CDN': {
        topic: function () {
            new AssetGraph({root: __dirname + '/bundleRequireJs/httpPath/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 3 JavaScript assets with the expected urls': function (assetGraph) {
            assert.deepEqual(_.pluck(assetGraph.findAssets({type: 'JavaScript', isInline: false}), 'url').sort(), [
                assetGraph.root + 'main.js',
                assetGraph.root + 'require.js',
                'http://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js'
            ]);
        }
    },
    'After loading a test case with a root-relative require alongside a non-root-relative require to the same file': {
        topic: function () {
            new AssetGraph({root: __dirname + '/bundleRequireJs/rootRelative/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 1 Text asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Text'}).length, 1);
        },
        'then run the bundleRequireJs transform': {
            topic: function (assetGraph) {
                assetGraph.bundleRequireJs().run(this.callback);
            },
            'the JavaScript should have the expected contents': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlRequireJsMain'})[0].to.text,
                             uglifyJs.parse(function () {
                                 define("foo.txt", GETTEXT("foo.txt"));

                                 require(['foo.txt', 'foo.txt'], function (fooText1, fooText2){
                                     alert("fooText1=" + fooText1 + " fooText2=" + fooText2);
                                 });

                                 define("main", function () {});
                             }.toString().replace(/^function[^\(]*?\(\)\s*\{|}$/g, '')).print_to_string());
            }
        }
    },
    'After loading a test case with a paths config that maps theLibrary to 3rdparty/theLibrary': {
        topic: function () {
            new AssetGraph({root: __dirname + '/bundleRequireJs/paths/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 5 JavaScript assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 5);
        },
        'then run the bundleRequireJs transform': {
            topic: function (assetGraph) {
                assetGraph.bundleRequireJs().run(this.callback);
            },
            'the JavaScript should have the expected contents': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlRequireJsMain'})[0].to.text,
                             uglifyJs.parse(function () {
                                 define('theLibrary', function () {
                                     return 'the contents of theLibrary';
                                 });

                                 define("subdir/bar", function () { return "bar"; });

                                 define("subdir/foo", ["./bar"], function (bar) { alert("Got bar: "+bar); return{}; });

                                 require.config({
                                     paths: {
                                         theLibrary: '3rdparty/theLibrary'
                                     }
                                 });
                                 require(['theLibrary', 'subdir/foo'], function (theLibrary) {
                                     alert("Got the library: " + theLibrary);
                                 });

                                 define("main", function() {});
                             }.toString().replace(/^function[^\(]*?\(\)\s*\{|}$/g, '')).print_to_string());
            }
        }
    },
    'After loading a test case with some document-relative dependencies': {
        topic: function () {
            new AssetGraph({root: __dirname + '/bundleRequireJs/documentRelativeDependencies/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 5 JavaScript loaded assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript', isLoaded: true}).length, 5);
        },
        'then run the bundleRequireJs transform': {
            topic: function (assetGraph) {
                assetGraph.bundleRequireJs().run(this.callback);
            },
            'the JavaScript should have the expected contents': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlRequireJsMain'})[0].to.text,
                             uglifyJs.parse(function () {
                                 define('/thingAtTheRoot.js', function () {
                                     return 'thing at the root';
                                 });

                                 define('anotherThingAtTheRoot.js', function () {
                                     return 'another thing at the root';
                                 });

                                 define('thingInScripts', function () {
                                     return 'thing in scripts';
                                 });

                                 require(['/thingAtTheRoot.js', 'anotherThingAtTheRoot.js', 'thingInScripts'], function (thingAtTheRoot, anotherThingAtTheRoot, thingInScripts) {
                                     alert('got ' + thingAtTheRoot + ', ' + anotherThingAtTheRoot + ', and ' + thingInScripts);
                                 });

                                 define('main', function () {});
                             }.toString().replace(/^function[^\(]*?\(\)\s*\{|}$/g, '')).print_to_string());
            }
        }
    }
})['export'](module);
