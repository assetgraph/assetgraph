/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    _ = require('lodash'),
    AssetGraph = require('../../lib');

describe('relations/HtmlJsx', function () {
    it('should handle a test case with existing <script type="text/jsx"> elements', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlJsx/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations including unresolved', 'HtmlJsx', 2);
                expect(_.map(assetGraph.findRelations(), 'href'), 'to equal', [
                    'externalWithTypeTextJsx.js',
                    undefined,
                    'external.jsx'
                ]);

                var assets = _.map(assetGraph.findRelations(), 'to');

                expect(assets[0].text, 'to equal', '\'external\'\n');
                expect(assets[1].text, 'to equal', '\'inline\'');
                expect(assets[2].text, 'to equal', '\'externalNoContentType\'');
            })
            .run(done);
    });

    it('should attach relations with the correct content type', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlJsx/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                var html = assetGraph.findAssets({ type: 'Html' })[0];
                var target = assetGraph.findAssets({ fileName: 'external.jsx' })[0];
                var relation = new AssetGraph.HtmlJsx({
                    to: target
                });

                relation.attach(html, 'after', target.incomingRelations[0]);

                expect(relation.from, 'to be', html);
                expect(relation.node, 'not to be undefined');
                expect(relation.node.getAttribute('type'), 'to be', target.contentType);
            })
            .run(done);
    });
});
