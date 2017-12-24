/*global describe, it*/
var expect = require('../unexpected-with-plugins');
var sinon = require('sinon');
var AssetGraph = require('../../lib/AssetGraph');
var errors = require('../../lib/errors');

describe('transforms/compressJavaScript', function () {
    [undefined, 'uglifyJs'].forEach(function (compressorName) {
        it('with compressorName=' + compressorName + ' should yield a compressed JavaScript', function () {
            return new AssetGraph()
                .loadAssets(new AssetGraph.JavaScript({text: 'var foo = 123;'}))
                .compressJavaScript({type: 'JavaScript'}, compressorName)
                .queue(function (assetGraph) {
                    expect(assetGraph, 'to contain asset', 'JavaScript');
                    expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to match', /^var foo=123;?\n?$/);
                });
        });
    });

    it('should warn when UglifyJS runs into a parse error and leave the asset unchanged', function () {
        var warnSpy = sinon.spy();
        return new AssetGraph()
            .on('warn', warnSpy)
            .loadAssets(new AssetGraph.JavaScript({text: 'var foo = `123`;'}))
            .compressJavaScript({type: 'JavaScript'})
            .queue(function (assetGraph) {
                expect(warnSpy, 'to have calls satisfying', function () {
                    warnSpy(new errors.ParseError('Parse error in inline JavaScript\nUnexpected character \'`\' (line 1, column 11)'));
                });
                expect(assetGraph, 'to contain asset', 'JavaScript');
                expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to equal', 'var foo = `123`;');
            });
    });

    describe('ie8 handling', function () {
        it('should honor assetGraph.javaScriptSerializationOptions.ie8 === true', function () {
            var warnSpy = sinon.spy();
            return new AssetGraph()
                .on('warn', warnSpy)
                .queue(function (assetGraph) {
                    assetGraph.javaScriptSerializationOptions = { ie8: true };
                    assetGraph.addAsset(new AssetGraph.JavaScript({text: 'foo["catch"] = 123;'}));
                })
                .compressJavaScript({type: 'JavaScript'})
                .queue(function (assetGraph) {
                    expect(warnSpy, 'was not called');
                    expect(assetGraph, 'to contain asset', 'JavaScript');
                    expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to equal', 'foo["catch"]=123;');
                });
        });

        it('should honor assetGraph.javaScriptSerializationOptions.ie8 === false', function () {
            var warnSpy = sinon.spy();
            return new AssetGraph()
                .on('warn', warnSpy)
                .queue(function (assetGraph) {
                    assetGraph.javaScriptSerializationOptions = { ie8: false };
                    assetGraph.addAsset(new AssetGraph.JavaScript({text: 'foo["catch"] = 123;'}));
                })
                .compressJavaScript({type: 'JavaScript'})
                .queue(function (assetGraph) {
                    expect(warnSpy, 'was not called');
                    expect(assetGraph, 'to contain asset', 'JavaScript');
                    expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to equal', 'foo.catch=123;');
                });
        });

        it('should honor asset.serializationOptions.ie8 === true', function () {
            var warnSpy = sinon.spy();
            return new AssetGraph()
                .on('warn', warnSpy)
                .queue(function (assetGraph) {
                    var asset = new AssetGraph.JavaScript({text: 'foo["catch"] = 123;'});
                    asset.serializationOptions = { ie8: true };
                    assetGraph.addAsset(asset);
                })
                .compressJavaScript({type: 'JavaScript'})
                .queue(function (assetGraph) {
                    expect(warnSpy, 'was not called');
                    expect(assetGraph, 'to contain asset', 'JavaScript');
                    expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to equal', 'foo["catch"]=123;');
                });
        });

        it('should honor asset.serializationOptions.ie8 === false', function () {
            var warnSpy = sinon.spy();
            return new AssetGraph()
                .on('warn', warnSpy)
                .queue(function (assetGraph) {
                    var asset = new AssetGraph.JavaScript({text: 'foo["catch"] = 123;'});
                    asset.serializationOptions = { ie8: false };
                    assetGraph.addAsset(asset);
                })
                .compressJavaScript({type: 'JavaScript'})
                .queue(function (assetGraph) {
                    expect(warnSpy, 'was not called');
                    expect(assetGraph, 'to contain asset', 'JavaScript');
                    expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to equal', 'foo.catch=123;');
                });
        });

        it('should honor assetGraph.javaScriptSerializationOptions.screw_ie8 === false', function () {
            var warnSpy = sinon.spy();
            return new AssetGraph()
                .on('warn', warnSpy)
                .queue(function (assetGraph) {
                    assetGraph.javaScriptSerializationOptions = { screw_ie8: false };
                    assetGraph.addAsset(new AssetGraph.JavaScript({text: 'foo["catch"] = 123;'}));
                })
                .compressJavaScript({type: 'JavaScript'})
                .queue(function (assetGraph) {
                    expect(warnSpy, 'was not called');
                    expect(assetGraph, 'to contain asset', 'JavaScript');
                    expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to equal', 'foo["catch"]=123;');
                });
        });

        it('should honor assetGraph.javaScriptSerializationOptions.screw_ie8 === true', function () {
            var warnSpy = sinon.spy();
            return new AssetGraph()
                .on('warn', warnSpy)
                .queue(function (assetGraph) {
                    assetGraph.javaScriptSerializationOptions = { screw_ie8: true };
                    assetGraph.addAsset(new AssetGraph.JavaScript({text: 'foo["catch"] = 123;'}));
                })
                .compressJavaScript({type: 'JavaScript'})
                .queue(function (assetGraph) {
                    expect(warnSpy, 'was not called');
                    expect(assetGraph, 'to contain asset', 'JavaScript');
                    expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to equal', 'foo.catch=123;');
                });
        });

        it('should honor asset.serializationOptions.screw_ie8 === false', function () {
            var warnSpy = sinon.spy();
            return new AssetGraph()
                .on('warn', warnSpy)
                .queue(function (assetGraph) {
                    var asset = new AssetGraph.JavaScript({text: 'foo["catch"] = 123;'});
                    asset.serializationOptions = { screw_ie8: false };
                    assetGraph.addAsset(asset);
                })
                .compressJavaScript({type: 'JavaScript'})
                .queue(function (assetGraph) {
                    expect(warnSpy, 'was not called');
                    expect(assetGraph, 'to contain asset', 'JavaScript');
                    expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to equal', 'foo["catch"]=123;');
                });
        });

        it('should honor asset.serializationOptions.screw_ie8 === true', function () {
            var warnSpy = sinon.spy();
            return new AssetGraph()
                .on('warn', warnSpy)
                .queue(function (assetGraph) {
                    var asset = new AssetGraph.JavaScript({text: 'foo["catch"] = 123;'});
                    asset.serializationOptions = { screw_ie8: true };
                    assetGraph.addAsset(asset);
                })
                .compressJavaScript({type: 'JavaScript'})
                .queue(function (assetGraph) {
                    expect(warnSpy, 'was not called');
                    expect(assetGraph, 'to contain asset', 'JavaScript');
                    expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to equal', 'foo.catch=123;');
                });
        });
    });

    // Tracking https://github.com/mishoo/UglifyJS2/issues/2313
    it('should not break code that uses getters and setters', function () {
        var warnSpy = sinon.spy();
        return new AssetGraph()
            .loadAssets({
                type: 'JavaScript',
                url: 'http://example.com/script.js',
                text:
                    'var foo = { _bar: 0 };\n' +
                    '\n' +
                    'Object.defineProperty(foo, \'bar\', {\n' +
                    '    get: function () {\n' +
                    '        // Side effect in getter: Increment this._bar\n' +
                    '        this._bar += 1;\n' +
                    '        return this._bar;\n' +
                    '    },\n' +
                    '    set: function (bar) {\n' +
                    '        this._bar = bar;\n' +
                    '    }\n' +
                    '});\n' +
                    '\n' +
                    '(function () {\n' +
                    '    this.foo.bar++;\n' +
                    '    if (this.foo.bar > 2) {\n' +
                    '        console.log(\'yay\');\n' +
                    '    }\n' +
                    '}.call({foo: foo}));'
            })
            .compressJavaScript({type: 'JavaScript'})
            .queue(function (assetGraph) {
                expect(warnSpy, 'was not called');
                expect(assetGraph, 'to contain asset', 'JavaScript');
                expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to contain', 'this.foo.bar++')
                    .and('to contain', 'this.foo.bar>')
                    .and('not to contain', '++this.foo.bar');
            });
    });

    // https://github.com/mishoo/UglifyJS2/issues/180
    it('should not break code that has a comment before EOF', function () {
        return new AssetGraph()
            .loadAssets({
                type: 'JavaScript',
                url: 'http://example.com/script.js',
                text:
                    'var foo = 123;//@preserve bar'
            })
            .compressJavaScript({type: 'JavaScript'})
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to equal', 'var foo=123;//@preserve bar\n');
            });
    });
});
