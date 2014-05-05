var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/JavaScriptSourceUrl', function () {
    it('should handle a test case with a JavaScript asset that has @sourceMappingURL directive', function (done) {
        new AssetGraph({root: __dirname + '/JavaScriptSourceMappingUrl/existingSourceMap/'})
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
});
