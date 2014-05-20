var expect = require('../unexpected-with-plugins'),
    _ = require('underscore'),
    AssetGraph = require('../../lib'),
    query = AssetGraph.query;

describe('relations/HtmlScript', function () {
    it('should handle a test case with existing <script> elements', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlScript/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations including unresolved', 'HtmlScript', 6);
                expect(_.pluck(assetGraph.findRelations(), 'href'), 'to equal', [
                    'externalNoType.js',
                    undefined,
                    'externalWithTypeTextJavaScript.js',
                    undefined,
                    'externalWithTypeTextCoffeeScript.js',
                    undefined
                ]);
            })
            .run(done);
    });
});
