var vows = require('vows'),
    assert = require('assert'),
    uglifyJs = require('uglify-js'),
    AssetGraph = require('../lib/AssetGraph');

function getFunctionBodySource(fn) {
    return uglifyJs.uglify.gen_code(uglifyJs.parser.parse(fn.toString().replace(/^function \(\) \{\n|\}$/g, '')), {beautify: true});
}

vows.describe('transforms.pullGlobalsIntoVariables').addBatch({
    'After loading a test case with a single JavaScript asset, then running the pullGlobalsIntoVariables transform': {
        topic: function () {
            new AssetGraph()
                .loadAssets({
                    type: 'JavaScript',
                    url: 'file:///foo.js',
                    text: getFunctionBodySource(function () {
                        var MATHMIN = 2;
                        var parseInt = function () {
                            return 99;
                        };
                        function parseFloat () {
                            return 99.0;
                        }
                        var quux = function isFinite() {
                            return false;
                        };
                        var id = setTimeout(function foo() {
                            var bar = Math.min(Math.min(4, 6), Math.max(4, 6) + Math.floor(8.2) + foo.bar.quux.baz + foo.bar.quux.w00p + parseInt('123') + parseInt('456'), parseFloat('99.5') + parseFloat('99.5') + isFinite(1) + isFinite(1));
                            setTimeout(foo, 100);
                        }, 100);
                    })
                })
                .pullGlobalsIntoVariables({type: 'JavaScript'}, ['foo.bar.quux', 'setTimeout', 'Math', 'Math.max', 'Math.floor', 'Math.min', 'isFinite', 'parseFloat', 'parseInt'])
                .prettyPrintAssets()
                .run(this.callback);
        },
        'the globals in the JavaScript should be hoisted': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'})[0].text,
                         getFunctionBodySource(function () {
                             var SETTIMEOUT = setTimeout;
                             var MATH = Math;
                             var MATHMIN_ = MATH.min;
                             var FOOBARQUUX = foo.bar.quux;
                             var MATHMIN = 2;
                             var parseInt = function () {
                                 return 99;
                             };
                             function parseFloat () {
                                 return 99.0;
                             }
                             var quux = function isFinite() {
                                 return false;
                             };
                             var id = SETTIMEOUT(function foo() {
                                 var bar = MATHMIN_(MATHMIN_(4, 6), MATH.max(4, 6) + MATH.floor(8.2) + FOOBARQUUX.baz + FOOBARQUUX.w00p + parseInt('123') + parseInt('456'), parseFloat('99.5') + parseFloat('99.5') + isFinite(1) + isFinite(1));
                                 SETTIMEOUT(foo, 100);
                             }, 100);
                         })
            );
        }
    },
    'then load another test case with a single JavaScript then run the pullGlobalsIntoVariables transform with wrapInFunction=true': {
        topic: function () {
            new AssetGraph()
                .loadAssets({
                    type: 'JavaScript',
                    url: 'file:///foo.js',
                    text: getFunctionBodySource(function () {
                        alert(Math.floor(10.8) + Math.floor(20.4) + Math.min(3, 5));
                    })
                })
                .pullGlobalsIntoVariables({type: 'JavaScript'}, null, true)
                .prettyPrintAssets()
                .run(this.callback);
        },
        'the globals in the JavaScript should be provided as args to an immediately invoked function': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript'})[0].text,
                         getFunctionBodySource(function () {
                             (function (MATH, MATHFLOOR) {
                                 alert(MATHFLOOR(10.8) + MATHFLOOR(20.4) + MATH.min(3, 5));
                             }(Math, Math.floor));
                         })
            );
        }
    }
})['export'](module);
