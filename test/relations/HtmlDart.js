/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib/');

describe('relations/HtmlDart', function () {
    it('should handle a simple test case', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlDart/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relation');
                expect(assetGraph.findRelations()[0].href, 'to equal', 'app.dart');
                expect(assetGraph.findAssets({type: 'Dart'})[0].text, 'to equal', '\'I am Dart\'\n');
            })
            .run(done);
    });

    it('should not inline Dart assets (unsupported)', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlDart/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', { type: 'Dart', isInline: false }, 1);
            })
            .inlineRelations('HtmlDart')
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', { type: 'Dart', isInline: false }, 1);
            })
            .run(done);
    });
});
