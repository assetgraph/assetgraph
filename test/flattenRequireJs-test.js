var vows = require('vows'),
    assert = require('assert'),
    _ = require('underscore'),
    fs = require('fs'),
    path = require('path'),
    AssetGraph = require('../lib'),
    uglifyJs = AssetGraph.JavaScript.uglifyJs,
    uglifyAst = AssetGraph.JavaScript.uglifyAst;

function toAst(functionOrAst) {
    if (typeof functionOrAst === 'function') {
        return uglifyJs.parse(functionOrAst.toString().replace(/^function[^\(]*?\(\)\s*\{|\}$/g, ''));
    } else {
        return functionOrAst;
    }
}

function assertAstsEqual(topic, expected) {
    assert.equal(toAst(topic).print_to_string(), toAst(expected).print_to_string());
}

vows.describe('transforms.flattenRequireJs').addBatch({
    'After loading the jquery-require-sample test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/flattenRequireJs/jquery-require-sample/webapp/'})
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
        'then running the flattenRequireJs transform': {
            topic: function (assetGraph) {
                assetGraph
                    .flattenRequireJs({type: 'Html'})
                    .run(this.callback);
            },
            'the resulting scripts should be identical to the output of the require.js optimizer': function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                assert.equal(htmlScripts.length, 4);
                assert.equal(htmlScripts[0].href, 'scripts/require-jquery.js');
                assertAstsEqual(htmlScripts[1].to.parseTree, function () {
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
            }
        }
    },
    'After loading test case with a text dependency': {
        topic: function () {
            new AssetGraph({root: __dirname + '/flattenRequireJs/textDependency/'})
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
        'then running the flattenRequireJs transform': {
            topic: function (assetGraph) {
                assetGraph.flattenRequireJs({type: 'Html'}).run(this.callback);
            },
            'the graph should contain GETTEXT relation pointing at myTextFile.txt': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'JavaScriptGetText', to: {url: /\/myTextFile\.txt$/}}).length, 1);
            },
            'the resulting main.js should have a define("myTextFile.txt") and the "text!" prefix should be stripped from the require list': function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                assert.equal(htmlScripts.length, 3);
                assert.equal(htmlScripts[0].href, 'require.js');
                assertAstsEqual(htmlScripts[1].to.parseTree, function () {
                    define("myTextFile.txt",GETTEXT("myTextFile.txt"));
                });
                assertAstsEqual(htmlScripts[2].to.parseTree, function () {
                    require(["myTextFile.txt"], function (contentsOfMyTextFile) {
                        alert(contentsOfMyTextFile + ", yay!");
                    });
                    define("main", function () {});
                });
            },
            'then inline the JavaScriptGetText relations': {
                topic: function (assetGraph) {
                    assetGraph.inlineRelations({type: 'JavaScriptGetText'}).run(this.callback);
                },
                'main.js should should contain the contents of myTextFile.txt': function (assetGraph) {
                    var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                    assert.equal(htmlScripts.length, 3);
                    assert.equal(htmlScripts[0].href, 'require.js');
                    assertAstsEqual(htmlScripts[1].to.parseTree, function () {
                        define("myTextFile.txt", "THE TEXT!\n");
                    });
                    assertAstsEqual(htmlScripts[2].to.parseTree, function () {
                        require(["myTextFile.txt"], function (contentsOfMyTextFile) {
                            alert(contentsOfMyTextFile + ", yay!");
                        });
                        define("main", function(){});
                    });
                }
            }
        }
    },
    'After loading test case with a module that has multiple incoming JavaScriptAmd* relations': {
        topic: function () {
            new AssetGraph({root: __dirname + '/flattenRequireJs/multipleIncoming/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 5 JavaScript assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 5);
        },
        'then running the flattenRequireJs transform': {
            topic: function (assetGraph) {
                assetGraph.flattenRequireJs({type: 'Html'}).run(this.callback);
            },
            'the resulting main.js should have the expected parse tree': function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                assert.equal(htmlScripts.length, 5);
                assert.equal(htmlScripts[0].href, 'require.js');
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
            }
        }
    },
    'After loading a slightly different test case with a module that has multiple incoming JavaScriptAmd* relations': {
        topic: function () {
            new AssetGraph({root: __dirname + '/flattenRequireJs/multipleIncoming2/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 4 JavaScript assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 4);
        },
        'then running the flattenRequireJs transform': {
            topic: function (assetGraph) {
                assetGraph.flattenRequireJs({type: 'Html'}).run(this.callback);
            },
            'the resulting scripts should have the expected contents': function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                assert.equal(htmlScripts.length, 4);
                assert.equal(htmlScripts[0].href, 'require.js');
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
            }
        }
    },
    'After loading test case with a module that is included via a script tag and a JavaScriptAmdRequire relation': {
        topic: function () {
            new AssetGraph({root: __dirname + '/flattenRequireJs/nonOrphanedJavaScript/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 3 JavaScript assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 3);
        },
        'the graph should contain 2 HtmlScript relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlScript'}).length, 2);
        },
        'then running the flattenRequireJs transform': {
            topic: function (assetGraph) {
                assetGraph.flattenRequireJs({type: 'Html'}).run(this.callback);
            },
            'the resulting scripts should have the expected contents': function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                assert.equal(htmlScripts.length, 4);
                assert.equal(htmlScripts[0].href, 'includedInHtmlAndViaRequire.js');
                assert.equal(htmlScripts[1].href, 'require.js');
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
            }
        }
    },
    'After loading test case that uses require(...) in a regular <script>': {
        topic: function () {
            new AssetGraph({root: __dirname + '/flattenRequireJs/withoutHtmlRequireJsMain/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 5 JavaScript assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 5);
        },
        'then running the flattenRequireJs transform': {
            topic: function (assetGraph) {
                assetGraph.flattenRequireJs({type: 'Html'}).run(this.callback);
            },
            'the resulting inline script should have the expected contents': function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                assert.equal(htmlScripts.length, 5);
                assert.equal(htmlScripts[0].href, 'require.js');
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
            }
        }
    },
    'After loading test case that uses require(...) to fetch a css file': {
        topic: function () {
            new AssetGraph({root: __dirname + '/flattenRequireJs/cssRequire/'})
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
        'then running the flattenRequireJs transform': {
            topic: function (assetGraph) {
                assetGraph.flattenRequireJs({type: 'Html'}).run(this.callback);
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
            new AssetGraph({root: __dirname + '/flattenRequireJs/withOneGetStaticUrl/'})
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
        'then running the flattenRequireJs transform': {
            topic: function (assetGraph) {
                assetGraph.flattenRequireJs({type: 'Html'}).run(this.callback);
            },
            'the graph should contain 1 Png asset': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'Png'}).length, 1);
            },
            'the resulting main script should have the expected contents': function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                assert.equal(htmlScripts.length, 5);
                assert.matches(htmlScripts[0].to.url, /\/require\.js$/);

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
            }
        }
    },
    'After loading the umd test case and running the flattenRequireJs transform': {
        topic: function () {
            new AssetGraph({root: __dirname + '/flattenRequireJs/umd/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .flattenRequireJs({type: 'Html'})
                .run(this.callback);
        },
        'the bundled main script should have the expected contents': function (assetGraph) {
            var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
            assert.equal(htmlScripts.length, 3);
            assert.matches(htmlScripts[0].to.url, /\/require\.js$/);

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
        }
    },
    'After loading the umd test case without requirejs and running the flattenRequireJs transform': {
        topic: function () {
            var cb = this.callback;
            new AssetGraph({root: __dirname + '/flattenRequireJs/umdWithoutRequire/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .run(function (err, assetGraph) {
                    assetGraph._localstorageText = assetGraph.findAssets({
                        url: /backbone.localStorage.js$/
                    })[0].text;

                    assetGraph
                        .flattenRequireJs({type: 'Html', isFragment: false})
                        .run(cb);
                });
        },
        'the number of script relations should be 3': function (assetGraph) {
            var scriptRelations = assetGraph.findRelations({
                to: {
                    type: 'JavaScript'
                }
            });
            assert.equal(scriptRelations.length, 3);
        },
        'there should be no JavaScriptAmdDefine relations': function (assetGraph) {
            var relations = assetGraph.findRelations({type: 'JavaScriptAmdDefine'});
            assert.equal(relations.length, 0);
        }
    },
    'After loading the umd test case where the wrapper has a dependency in the define call, then running the flattenRequireJs transform': {
        topic: function () {
            new AssetGraph({root: __dirname + '/flattenRequireJs/umdWithDependency/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .flattenRequireJs({type: 'Html'})
                .run(this.callback);
        },
        'the bundled main script should have the expected contents': function (assetGraph) {
            var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
            assert.equal(htmlScripts.length, 4);
            assert.equal(htmlScripts[0].href, 'require.js');
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
        }
    },
    'After loading the non-umd test case and running the flattenRequireJs transform': {
        topic: function () {
            new AssetGraph({root: __dirname + '/flattenRequireJs/nonUmd/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .flattenRequireJs({type: 'Html'})
                .run(this.callback);
        },
        'the bundled main script should have the expected contents': function (assetGraph) {
            var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
            assert.equal(htmlScripts.length, 3);
            assert.equal(htmlScripts[0].href, 'require.js');
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
        }
    },
    'After loading a test case with multiple Html files depending on the same modules, then running the flattenRequireJs transform': {
        topic: function () {
            new AssetGraph({root: __dirname + '/flattenRequireJs/multipleHtmls/'})
                .registerRequireJsConfig()
                .loadAssets('*.html')
                .populate()
                .flattenRequireJs({type: 'Html'})
                .run(this.callback);
        },
        'index1.html should have the expected HtmlScript relations': function (assetGraph) {
            var htmlScripts = assetGraph.findRelations({type: 'HtmlScript', from: {url: /\/index1\.html$/}});
            assert.equal(htmlScripts.length, 4);
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
        },
        'index2.html should have the expected HtmlScript relations': function (assetGraph) {
            var htmlScripts = assetGraph.findRelations({type: 'HtmlScript', from: {url: /\/index2\.html$/}});
            assert.equal(htmlScripts.length, 4);
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
        }
    },
    'After loading a test case using the less! plugin, then running the flattenRequireJs transform': {
        topic: function () {
            new AssetGraph({root: __dirname + '/flattenRequireJs/lessPlugin/'})
                .registerRequireJsConfig()
                .loadAssets('index*.html')
                .populate()
                .flattenRequireJs({type: 'Html'})
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
            new AssetGraph({root: __dirname + '/flattenRequireJs/shim/'})
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
            'then run the flattenRequireJs transform': {
                topic: function (assetGraph) {
                    assetGraph.flattenRequireJs().run(this.callback);
                },
                'the resulting scripts should have the expected contents': function (assetGraph) {
                    var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                    assert.equal(htmlScripts.length, 7);
                    assert.matches(htmlScripts[0].to.text, /var require\s*=/);
                    assert.matches(htmlScripts[1].to.url, /\/require\.js$/);

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
                }
            }
        }
    },
    'After loading a test case with a non-string items in the require array': {
        topic: function () {
            new AssetGraph({root: __dirname + '/flattenRequireJs/nonString/'})
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
        'then run the flattenRequireJs transform': {
            topic: function (assetGraph) {
                assetGraph
                    .flattenRequireJs({type: 'Html'})
                    .run(this.callback);
            },
            'the graph should contain 5 JavaScript assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 5);
            }
        }
    },
    'After loading a test case with relative dependencies': {
        topic: function () {
            new AssetGraph({root: __dirname + '/flattenRequireJs/relativeDependencies/'})
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
        'then run the flattenRequireJs transform': {
            topic: function (assetGraph) {
                assetGraph
                    .flattenRequireJs({type: 'Html'})
                    .run(this.callback);
            },
            'the resulting scripts should have the expected contents': function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                assert.equal(htmlScripts.length, 5);

                assert.matches(htmlScripts[0].to.url, /\/require\.js$/);
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
            }
        }
    },
    'After loading a test case with a relative dependencies once again': {
        topic: function () {
            new AssetGraph({root: __dirname + '/flattenRequireJs/relativeDependencies/'})
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
        'then move quux.js and run the flattenRequireJs transform': {
            topic: function (assetGraph) {
                var quuxJs = assetGraph.findAssets({url: /\/quux\.js/})[0];
                quuxJs.url = quuxJs.url.replace(/subsubdir/, 'othersubdir');
                assetGraph
                    .flattenRequireJs({type: 'Html'})
                    .run(this.callback);
            },
            'the resulting scripts should have the expected contents': function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                assert.equal(htmlScripts.length, 5);
                assert.equal(htmlScripts[0].href, 'require.js');
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
            }
        }
    },
    'After loading a test case with a paths config that points jquery at a CDN': {
        topic: function () {
            new AssetGraph({root: __dirname + '/flattenRequireJs/httpPath/'})
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
            new AssetGraph({root: __dirname + '/flattenRequireJs/rootRelative/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 1 Text asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Text'}).length, 1);
        },
        'then run the flattenRequireJs transform': {
            topic: function (assetGraph) {
                assetGraph.flattenRequireJs().run(this.callback);
            },
            'the JavaScript should have the expected contents': function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                assert.equal(htmlScripts.length, 3);
                assert.equal(htmlScripts[0].href, 'require.js');
                assertAstsEqual(htmlScripts[1].to.parseTree, function () {
                    define("foo.txt", GETTEXT("foo.txt"));
                });
                assertAstsEqual(htmlScripts[2].to.parseTree, function () {
                    require(['foo.txt', 'foo.txt'], function (fooText1, fooText2){
                        alert("fooText1=" + fooText1 + " fooText2=" + fooText2);
                    });
                    define("main", function () {});
                });
            }
        }
    },
    'After loading a test case with a paths config that maps theLibrary to 3rdparty/theLibrary': {
        topic: function () {
            new AssetGraph({root: __dirname + '/flattenRequireJs/paths/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 5 JavaScript assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 5);
        },
        'then run the flattenRequireJs transform': {
            topic: function (assetGraph) {
                assetGraph.flattenRequireJs().run(this.callback);
            },
            'the JavaScript should have the expected contents': function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                assert.equal(htmlScripts.length, 5);
                assert.matches(htmlScripts[0].to.url, /\/require\.js$/);

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
            }
        }
    },
    'After loading a test case with some document-relative dependencies': {
        topic: function () {
            new AssetGraph({root: __dirname + '/flattenRequireJs/documentRelativeDependencies/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 5 loaded JavaScript assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript', isLoaded: true}).length, 5);
        },
        'then run the flattenRequireJs transform': {
            topic: function (assetGraph) {
                assetGraph.flattenRequireJs().run(this.callback);
            },
            'the JavaScript should have the expected contents': function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                assert.equal(htmlScripts.length, 5);
                assert.equal(htmlScripts[0].href, 'require.js');
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
            }
        }
    },
    'After loading a test case with a data-main that only contains a define (#127)': {
        topic: function () {
            new AssetGraph({root: __dirname + '/flattenRequireJs/issue127/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 2 JavaScript assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 2);
        },
        'then run the flattenRequireJs transform': {
            topic: function (assetGraph) {
                assetGraph.flattenRequireJs().run(this.callback);
            },
            'the JavaScript should have the expected contents': function (assetGraph) {
                var htmlScripts = assetGraph.findRelations({type: 'HtmlScript'});
                assert.equal(htmlScripts.length, 2);
                assert.equal(htmlScripts[0].href, 'require.js');
                assertAstsEqual(htmlScripts[1].to.parseTree, function () {
                    define('main', function () {
                        alert('It gets lonely in here if nobody runs me');
                    });
                    require(['main']);
                });
            }
        }
    },
    // This is a common mistake that require.js tolerates, although it does have the side effect that the module definition
    // function is run twice. This test case asserts that flattenRequireJs emits an error as the build will be broken.
    'After loading a test case with a module that is referred to both with and without the .js extension': {
        topic: function () {
            new AssetGraph({root: __dirname + '/flattenRequireJs/multipleIncomingWithAndWithoutDotJsSuffix/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 5 JavaScript assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 5);
        },
        'then run the flattenRequireJs transform': {
            topic: function (assetGraph) {
                assetGraph
                    .on('error', function (err) {
                        (this._emittedErrors = this._emittedErrors || []).push(err);
                    })
                    .flattenRequireJs()
                    .run(this.callback);
            },
            'the correct error should be emitted': function (assetGraph) {
                assert.ok(assetGraph._emittedErrors);
                assert.equal(assetGraph._emittedErrors.length, 1);
                assert.matches(assetGraph._emittedErrors[0].message, /\/popular\.js is referred to as both popular and popular\.js, please omit the \.js extension in define\/require$/);
            }
        }
    },
    'After loading a test case with a umdish factory pattern': {
        topic: function () {
            new AssetGraph({root: __dirname + '/flattenRequireJs/umdishBackboneLocalstorage/'})
                .registerRequireJsConfig()
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'then run the flattenRequireJs transform': {
            topic: function (assetGraph) {
                assetGraph
                    .flattenRequireJs()
                    .run(this.callback);
            },
            'the file with the umdish pattern should be unchanged, except the canonical module name should be added as the first define argument': function (assetGraph) {
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
            }
        }
    }
})['export'](module);
