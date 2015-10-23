/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/JavaScriptSourceMappingUrl', function () {
    it('should handle a test case with a JavaScript asset that has @sourceMappingURL directive', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptSourceMappingUrl/existingSourceMap/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 4);
                expect(assetGraph, 'to contain assets', 'JavaScript', 2);
                expect(assetGraph, 'to contain asset', 'Html');
                expect(assetGraph, 'to contain asset', 'SourceMap');
                expect(assetGraph, 'to contain relation', 'JavaScriptSourceMappingUrl');
                expect(assetGraph, 'to contain relation', 'SourceMapFile');
                expect(assetGraph, 'to contain relation', 'SourceMapSource');
                assetGraph.findAssets({type: 'JavaScript'})[0].url = assetGraph.root + 'foo/jquery.js';

                expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to match', /@\s*sourceMappingURL=..\/jquery-1.10.1.min.map/);
            })
            .run(done);
    });

    it('should handle another test case with a JavaScript asset that has @sourceMappingURL directive', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptSourceMappingUrl/existingSourceMap2/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relation', 'JavaScriptSourceMappingUrl');
                expect(assetGraph, 'to contain relation', 'SourceMapSource');
            })
            .applySourceMaps()
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({type: 'JavaScript'})[0].parseTree.body[0].expression.argument.loc, 'to satisfy', {
                    start: { line: 15, column: 1 },
                    source: 'jquery-1.11.3.js'
                });
            })
            .run(done);
    });
});
