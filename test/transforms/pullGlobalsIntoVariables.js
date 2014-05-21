/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib'),
    uglifyJs = AssetGraph.JavaScript.uglifyJs;

function getFunctionBodySource(fn) {
    var outputStream = uglifyJs.OutputStream({beautify: true});
    uglifyJs.parse(fn.toString().replace(/^function \(\) \{\n|\}$/g, '')).print(outputStream);
    return outputStream.get();
}

describe('transforms/pullGlobalsIntoVariables', function () {
    it('should handle a test case with a single JavaScript asset', function (done) {
        new AssetGraph()
            .loadAssets({
                type: 'JavaScript',
                url: 'file:///foo.js',
                text: getFunctionBodySource(function () {
                    /* jshint ignore:start */
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
                    /* jshint ignore:end */
                })
            })
            .pullGlobalsIntoVariables({type: 'JavaScript'}, {globalNames: ['foo.bar.quux', 'setTimeout', 'Math', 'Math.max', 'Math.floor', 'Math.min', 'isFinite', 'parseFloat', 'parseInt']})
            .prettyPrintAssets()
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to equal',
                    getFunctionBodySource(function () {
                        /* jshint ignore:start */
                        var SETTIMEOUT = setTimeout,
                            MATH = Math,
                            MATHMIN_ = MATH.min,
                            FOOBARQUUX = foo.bar.quux;
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
                        /* jshint ignore:end */
                    })
                );
            })
            .run(done);
    });

    it('should handle a case with a single JavaScript when run with wrapInFunction:true', function (done) {
        new AssetGraph()
            .loadAssets({
                type: 'JavaScript',
                url: 'file:///foo.js',
                text: getFunctionBodySource(function () {
                    alert(Math.floor(10.8) + Math.floor(20.4) + Math.min(3, 5));
                })
            })
            .pullGlobalsIntoVariables({type: 'JavaScript'}, {wrapInFunction: true})
            .prettyPrintAssets()
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to equal',
                    getFunctionBodySource(function () {
                        (function (MATH, MATHFLOOR) {
                            alert(MATHFLOOR(10.8) + MATHFLOOR(20.4) + MATH.min(3, 5));
                        }(Math, Math.floor));
                    })
                );
            })
            .run(done);
    });

    it('should handle a test case with a single JavaScript asset when run with stringLiterals:true', function (done) {
        new AssetGraph()
            .loadAssets({
                type: 'JavaScript',
                url: 'file:///foo.js',
                text: getFunctionBodySource(function () {
                    /* jshint ignore:start */
                    var a = 'foobarquux',
                        b = 'foobarquux';
                    f.foobarquux();
                    /* jshint ignore:end */
                })
            })
            .pullGlobalsIntoVariables({type: 'JavaScript'}, {stringLiterals: true})
            .prettyPrintAssets()
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to equal',
                    getFunctionBodySource(function () {
                        /* jshint ignore:start */
                        var FOOBARQUUX = 'foobarquux';
                        var a = FOOBARQUUX,
                            b = FOOBARQUUX;
                        f[FOOBARQUUX]();
                        /* jshint ignore:end */
                    })
                );
            })
            .run(done);
    });
});
