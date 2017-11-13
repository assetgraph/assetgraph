const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');
const pathModule = require('path');

describe('SourceMap', function () {
    describe('with an old jquery build', function () {
        let sourceMap;
        let assetGraph;
        beforeEach(async function () {
            assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '..', '..', 'testdata', 'assets', 'SourceMap', 'jquery')});
            sourceMap = assetGraph.addAsset('jquery-1.10.1.min.map');
            await sourceMap.loadAsync();
        });

        it('should support #generatedPositionFor', function () {
            expect(sourceMap.generatedPositionFor({
                source: 'jquery-1.10.1.js',
                line: 23,
                column: 1
            }), 'to equal', {
                line: 4,
                column: 18,
                lastColumn: null
            });
        });

        it('should support #originalPositionFor', function () {
            expect(sourceMap.originalPositionFor({ line: 4, column: 19 }), 'to equal', {
                source: 'jquery-1.10.1.js',
                line: 23,
                column: 1,
                name: 'readyList'
            });
        });

        it('should not rely on a cached SourceMapConsumer when the asset is marked dirty', function () {
            sourceMap.originalPositionFor({ line: 4, column: 19 });
            sourceMap.text = '{}';
            expect(() => sourceMap.originalPositionFor({ line: 4, column: 19 }), 'to throw', '"version" is a required argument.');
        });
    });
});
