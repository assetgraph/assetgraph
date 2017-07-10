/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('assets/Text', function () {
    describe('#text', function () {
        it('should get text of Text asset with rawSrc property', function () {
            expect(new AssetGraph.Text({rawSrc: new Buffer('Hello, world!\u263a')}).text, 'to equal', 'Hello, world!\u263a');
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

        it('should get rawSrc of AssetGraph.Text with text property', function () {
            expect(new AssetGraph.Text({
                text: 'Hello, world!\u263a'
            }).rawSrc, 'to equal', new Buffer('Hello, world!\u263a', 'utf-8'));
        });
    });
});
