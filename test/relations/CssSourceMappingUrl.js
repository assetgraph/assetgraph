/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/CssSourceMappingUrl', function () {
    it('should handle a test case with a Css asset that has @sourceMappingURL directive', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/CssSourceMappingUrl/existingExternalSourceMap/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 4);
                expect(assetGraph, 'to contain asset', 'Css');
                expect(assetGraph, 'to contain asset', 'Html');
                expect(assetGraph, 'to contain asset', 'SourceMap');
                expect(assetGraph, 'to contain relation', 'CssSourceMappingUrl');
                expect(assetGraph, 'to contain relation', 'SourceMapFile');
                expect(assetGraph, 'to contain relation', 'SourceMapSource');
                assetGraph.findAssets({type: 'Css'})[0].url = assetGraph.root + 'foo/somewhereelse.css';

                expect(assetGraph.findAssets({type: 'Css'})[0].text, 'to match', /#\s*sourceMappingURL=..\/foo.map/);
            })
            .run(done);
    });
});
