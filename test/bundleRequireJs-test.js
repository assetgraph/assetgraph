var vows = require('vows'),
    assert = require('assert'),
    fs = require('fs'),
    path = require('path'),
    uglifyJs = require('uglify-js'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = AssetGraph.transforms;

vows.describe('transforms.bundleRequireJs').addBatch({
    'After loading the jquery-require-sample test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/bundleRequireJs/jquery-require-sample/webapp/'}).queue(
                transforms.loadAssets('app.html'),
                transforms.populate()
            ).run(this.callback);
        },
        'the graph should contain 5 assets': function (assetGraph) {
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
                assetGraph.runTransform(transforms.bundleRequireJs({type: 'Html'}), this.callback);
            },
            'the graph should contain 2 JavaScript assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 2);
            },
            'main.js should be identical to the output of the require.js optimizer': function (assetGraph) {
                var requireJsOptimizerOutputAst = uglifyJs.parser.parse(fs.readFileSync(path.resolve(__dirname, 'bundleRequireJs/jquery-require-sample/webapp-build/scripts/main.js'), 'utf-8'));
                assert.deepEqual(uglifyJs.uglify.gen_code(assetGraph.findAssets({type: 'JavaScript', url: /\/main\.js$/})[0].parseTree),
                                 uglifyJs.uglify.gen_code(requireJsOptimizerOutputAst));
            }
        }
    },
    'After loading test case with a text dependency': {
        topic: function () {
            new AssetGraph({root: __dirname + '/bundleRequireJs/textDependency/'}).queue(
                transforms.loadAssets('index.html'),
                transforms.populate()
            ).run(this.callback);
        },
        'the graph should contain 2 JavaScript assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 2);
        },
        'the graph should contain 1 non-inline Text asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Text', isInline: false}).length, 1);
        },
        'then running the bundleRequireJs transform': {
            topic: function (assetGraph) {
                assetGraph.runTransform(transforms.bundleRequireJs({type: 'Html'}), this.callback);
            },
            'the graph should contain one.getText relation pointing at myTextFile.txt': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'JavaScriptOneGetText', to: {url: /\/myTextFile\.txt$/}}).length, 1);
            },
            'the resulting main.js should have a define("myTextFile.txt") and the "text!" prefix should be stripped from the require list': function (assetGraph) {
                assert.equal(assetGraph.findAssets({url: /\/main\.js$/})[0].text,
                             'define("myTextFile.txt",one.getText("myTextFile.txt"));require(["myTextFile.txt"],function(contentsOfMyTextFile){alert(contentsOfMyTextFile+", yay!")});define("main",function(){})'
                );
            },
            'then inline the JavaScriptOneGetText relations': {
                topic: function (assetGraph) {
                    assetGraph.runTransform(transforms.inlineRelations({type: 'JavaScriptOneGetText'}), this.callback);
                },
                'main.js should should contain the contents of myTextFile.txt': function (assetGraph) {
                    assert.equal(assetGraph.findAssets({url: /\/main\.js$/})[0].text,
                                'define("myTextFile.txt","THE TEXT!\\n");require(["myTextFile.txt"],function(contentsOfMyTextFile){alert(contentsOfMyTextFile+", yay!")});define("main",function(){})'
                    );
                }
            }
        }
    },
    'After loading test case with a module that has multiple incoming JavaScriptAmd* relations': {
        topic: function () {
            new AssetGraph({root: __dirname + '/bundleRequireJs/multipleIncoming/'}).queue(
                transforms.loadAssets('index.html'),
                transforms.populate()
            ).run(this.callback);
        },
        'the graph should contain 5 JavaScript assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 5);
        },
        'then running the bundleRequireJs transform': {
            topic: function (assetGraph) {
                assetGraph.runTransform(transforms.bundleRequireJs({type: 'Html'}), this.callback);
            },
            'the resulting main.js should have the expected contents': function (assetGraph) {
                assert.equal(assetGraph.findAssets({url: /\/main\.js$/})[0].text,
                             'define("popular",function(){alert("I\'m a popular helper module");return"foo"});define("module1",["popular"],function(){return"module1"});define("module2",["popular"],function(){return"module2"});require(["module1","module2"],function(){alert("Got it all!")});define("main",function(){})'
                );
            }
        }
    },
    'After loading test case with a module that is included via a script tag and a JavaScriptAmdRequire relation': {
        topic: function () {
            new AssetGraph({root: __dirname + '/bundleRequireJs/nonOrphanedJavaScript/'}).queue(
                transforms.loadAssets('index.html'),
                transforms.populate()
            ).run(this.callback);
        },
        'the graph should contain 3 JavaScript assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 3);
        },
        'the graph should still contain 2 HtmlScript relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlScript'}).length, 2);
        },
        'then running the bundleRequireJs transform': {
            topic: function (assetGraph) {
                assetGraph.runTransform(transforms.bundleRequireJs({type: 'Html'}), this.callback);
            },
            'the graph should still contain 3 JavaScript assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 3);
            },
            'the graph should still contain 2 HtmlScript relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlScript'}).length, 2);
            },
            'the resulting main.js should have the expected contents': function (assetGraph) {
                assert.equal(assetGraph.findAssets({url: /\/main\.js$/})[0].text,
                             'alert("includedInHtmlAndViaRequire.js");define("includedInHtmlAndViaRequire",function(){});require(["includedInHtmlAndViaRequire"],function(foo){alert("Here we are!")});define("main",function(){})'
                );
            }
        }
    }
})['export'](module);
