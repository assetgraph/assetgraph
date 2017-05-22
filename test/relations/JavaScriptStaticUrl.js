/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    _ = require('lodash'),
    AssetGraph = require('../../lib/AssetGraph');

describe('relations/JavaScriptStaticUrl', function () {
    it('should handle root relative urls', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptStaticUrl/rootRelative/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(_.map(assetGraph.findRelations({type: 'JavaScriptStaticUrl'}), 'href'), 'to equal', [
                    '/images/foo.png'
                ]);
            });
    });
});
