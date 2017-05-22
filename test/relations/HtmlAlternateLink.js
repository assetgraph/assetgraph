/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib/AssetGraph');

describe('relations/HtmlAlternateLink', function () {
    it('should handle a simple test case', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlAlternateLink/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'HtmlAlternateLink', 4);
                expect(assetGraph, 'to contain assets', 'Rss', 2);
                expect(assetGraph, 'to contain asset', 'Atom');
                expect(assetGraph, 'to contain asset', 'Xml');
            })
            .run(done);
    });
});
