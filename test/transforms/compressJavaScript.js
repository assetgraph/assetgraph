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
});
