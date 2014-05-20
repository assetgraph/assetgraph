/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/HtmlImport', function () {
    it('should handle a test case with an existing <link rel="import"> element', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlImport/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'HtmlImport', 3);
                expect(assetGraph, 'to contain assets', {
                    type: 'Html',
                    isPopulated: true
                }, 4);
                expect(assetGraph, 'to contain assets', {
                    type: 'Css',
                    isPopulated: true
                }, 1);
            })
            .run(done);
    });
});
