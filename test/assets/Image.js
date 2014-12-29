/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    // sinon = require('sinon'),
    AssetGraph = require('../../lib');

// var rawSrc = new Buffer('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNgYAAAAAMAASsJTYQAAAAASUVORK5CYII=', 'base64');

describe('assets/Image', function () {
    describe('fileName getter and setter', function () {
        it('should set the fileName based on constructor configuration', function () {
            var img = new AssetGraph.Image({
                fileName: 'foo.png'
            });

            expect(img._fileName, 'to be', 'foo.png');
        });

        it('should get the fileName set in constructor configuration', function () {
            var img = new AssetGraph.Image({
                fileName: 'foo.png'
            });

            expect(img.fileName, 'to be', 'foo.png');
        });

        it('should set the fileName correctly', function () {
            var img = new AssetGraph.Image({
                fileName: 'foo.png'
            });

            img.fileName = 'bar.png';

            expect(img.fileName, 'to be', 'bar.png');
        });
    });

    describe('devicePixelRatio', function () {
        it('should have a default device pixel ratio of 1', function () {
            var img = new AssetGraph.Image({
                fileName: 'foo.png'
            });

            expect(img.fileName, 'to be', 'foo.png');
            expect(img.devicePixelRatio, 'to be', 1);
        });

        it('should set device pixel ratio via constructor options', function () {
            var img = new AssetGraph.Image({
                fileName: 'foo.png',
                devicePixelRatio: 2
            });

            expect(img.fileName, 'to be', 'foo.png');
            expect(img.devicePixelRatio, 'to be', 2);
        });

        it('should set device pixel ratio as a side effect of fileName via constructor options', function () {
            var img = new AssetGraph.Image({
                fileName: 'foo@3x.png'
            });

            expect(img.fileName, 'to be', 'foo@3x.png');
            expect(img.devicePixelRatio, 'to be', 3);
        });

        it('should set device pixel ratio as a side effect of url via constructor options', function () {
            var img = new AssetGraph.Image({
                url: 'path/to/foo@3x.png'
            });

            expect(img.fileName, 'to be', 'foo@3x.png');
            expect(img.devicePixelRatio, 'to be', 3);
        });

        it('should be able to set device pixel ratio via setter', function () {
            var img = new AssetGraph.Image({
                fileName: 'foo.png'
            });

            img.devicePixelRatio = 2;

            expect(img.fileName, 'to be', 'foo.png');
            expect(img.devicePixelRatio, 'to be', 2);
        });

        it('should keep its device pixel ratio even when a filname changes to no longer contain the ratio', function () {
            var img = new AssetGraph.Image({
                fileName: 'foo@4x.png'
            });

            img.fileName = 'foo.png';

            expect(img.fileName, 'to be', 'foo.png');
            expect(img.devicePixelRatio, 'to be', 4);
        });

        it('should update device pixel ratio when setting fileName', function () {
            var img = new AssetGraph.Image({
                fileName: 'foo.png'
            });

            img.fileName = 'foo@2x.png';

            expect(img.fileName, 'to be', 'foo@2x.png');
            expect(img.devicePixelRatio, 'to be', 2);
        });

        it('should update device pixel ratio when setting url', function () {
            var img = new AssetGraph.Image({
                url: 'path/to/foo.png'
            });

            img.url = 'path/to/foo@2x.png';

            expect(img.fileName, 'to be', 'foo@2x.png');
            expect(img.devicePixelRatio, 'to be', 2);
        });

        it('should support using comma as decimal seperator in device pixel ratio in url', function () {
            var img = new AssetGraph.Image({
                url: 'path/to/foo@2,5x.png'
            });

            expect(img.devicePixelRatio, 'to be', 2.5);

            img.url = 'path/to/foo@2,3x.png';

            expect(img.devicePixelRatio, 'to be', 2.3);
        });

        it('should support using comma as decimal seperator in device pixel ratio in fileName', function () {
            var img = new AssetGraph.Image({
                fileName: 'foo@2,5x.png'
            });

            expect(img.devicePixelRatio, 'to be', 2.5);

            img.fileName = 'foo@2,3x.png';

            expect(img.devicePixelRatio, 'to be', 2.3);
        });

        it('should throw if setting a non-number device pixel ratio', function () {
            var img = new AssetGraph.Image({
                fileName: 'foo.png'
            });

            expect(function () { img.devicePixelRatio = 4; }, 'not to throw');
            expect(function () { img.devicePixelRatio = 0.1; }, 'not to throw');
            expect(function () { img.devicePixelRatio = 0.000001; }, 'not to throw');
            expect(function () { img.devicePixelRatio = 99999999; }, 'not to throw');
            expect(function () { img.devicePixelRatio = '2'; }, 'not to throw');
            expect(function () { img.devicePixelRatio = '2.12345'; }, 'not to throw');
            expect(function () { img.devicePixelRatio = '2,5'; }, 'not to throw');

            expect(function () { img.devicePixelRatio = '-2'; }, 'to throw');
            expect(function () { img.devicePixelRatio = ''; }, 'to throw');
            expect(function () { img.devicePixelRatio = function () {}; }, 'to throw');
            expect(function () { img.devicePixelRatio = {}; }, 'to throw');
            expect(function () { img.devicePixelRatio = []; }, 'to throw');
            expect(function () { img.devicePixelRatio = null; }, 'to throw');
            expect(function () { img.devicePixelRatio = undefined; }, 'to throw');
            expect(function () { img.devicePixelRatio = true; }, 'to throw');

            expect(function () { img.devicePixelRatio = NaN; }, 'to throw');
            expect(function () { img.devicePixelRatio = 0; }, 'to throw');
            expect(function () { img.devicePixelRatio = Infinity; }, 'to throw');
            expect(function () { img.devicePixelRatio = -1; }, 'to throw');
            expect(function () { img.devicePixelRatio = 1e99; }, 'to throw');
        });
    });
});
