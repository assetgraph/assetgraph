/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    Promise = require('bluebird'),
    AssetGraph = require('../../lib');

describe('assets/Text', function () {
    describe('#text', function () {
        it('should get text of Text asset with rawSrc property', function () {
            expect(new AssetGraph.Text({rawSrc: new Buffer('Hello, world!\u263a')}).text, 'to equal', 'Hello, world!\u263a');
        });

        it('should get text of AssetGraph.Text with rawSrcProxy', function () {
            var asset = new AssetGraph.Text({
                rawSrcProxy: function () {
                    return Promise.resolve([new Buffer('Hello, world!\u263a')]);
                }
            });
            return asset.load().then(function () {
                expect(asset.text, 'to equal', 'Hello, world!\u263a');
            });
        });

        it('should get text of AssetGraph.Text with text property', function () {
            expect(new AssetGraph.Text({text: 'Hello, world!\u263a'}).text, 'to equal', 'Hello, world!\u263a');
        });
    });

    describe('#rawSrc', function () {
        it('should get rawSrc of AssetGraph.Text with rawSrc property', function () {
            expect(new AssetGraph.Text({
                rawSrc: new Buffer('Hello, world!\u263a', 'utf-8')
            }).rawSrc, 'to equal', new Buffer('Hello, world!\u263a', 'utf-8'));
        });

        it('should get rawSrc of AssetGraph.Text with rawSrcProxy', function () {
            var asset = new AssetGraph.Text({
                rawSrcProxy: function () {
                    return Promise.resolve([new Buffer('Hello, world!\u263a', 'utf-8')]);
                }
            });
            return asset.load().then(function () {
                expect(asset.rawSrc, 'to equal', new Buffer('Hello, world!\u263a', 'utf-8'));
            });
        });

        it('should get rawSrc of AssetGraph.Text with text property', function () {
            expect(new AssetGraph.Text({
                text: 'Hello, world!\u263a'
            }).rawSrc, 'to equal', new Buffer('Hello, world!\u263a', 'utf-8'));
        });
    });
});
