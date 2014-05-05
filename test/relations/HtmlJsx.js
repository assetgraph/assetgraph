var expect = require('../unexpected-with-plugins'),
    _ = require('underscore'),
    AssetGraph = require('../../lib');

describe('relations/HtmlJsx', function () {
    it('should handle a test case with existing <script type="text/jsx"> elements', function (done) {
        new AssetGraph({root: __dirname + '/HtmlJsx/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations including unresolved', 'HtmlJsx', 2);
                expect(_.pluck(assetGraph.findRelations(), 'href'), 'to equal', [
                    'externalWithTypeTextJsx.js',
                    undefined
                ]);

                var assets = _.pluck(assetGraph.findRelations(), 'to');

                expect(assets[0].text, 'to equal', "'external'\n");
                expect(assets[1].text, 'to equal', "'inline'");
            })
            .run(done);
    });
});
