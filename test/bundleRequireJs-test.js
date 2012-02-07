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
        'the graph should contain 2 JavaScript asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 2);
        },
        'the graph should contain 1 Text asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Text'}).length, 1);
        },
        'then running the bundleRequireJs transform': {
            topic: function (assetGraph) {
                assetGraph.runTransform(transforms.bundleRequireJs({type: 'Html'}), this.callback);
            },
            'the graph should contain no Text assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'Text'}).length, 0);
            },
            'the resulting main.js should have a define("myTextFile.txt") and the "text!" prefix should be stripped from the require list': function (assetGraph) {
                assert.equal(assetGraph.findAssets({url: /\/main\.js$/})[0].text,
                             'define("myTextFile.txt","THE TEXT!\\n");require(["myTextFile.txt"],function(contentsOfMyTextFile){alert(contentsOfMyTextFile+", yay!")});define("main",function(){})'
                );
            }
        }
    }
})['export'](module);
