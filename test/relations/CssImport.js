/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('relations/CssImport', function () {
    it('should handle a simple test case', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/CssImport/'})
            .loadAssets('index.css')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Css', 2);
                expect(assetGraph, 'to contain relation', 'CssImport');
                assetGraph.findRelations({type: 'CssImport'})[0].detach();
                expect(assetGraph.findAssets({url: /\/index.css$/})[0].parseTree.nodes, 'to have length', 1);
            })
            .run(done);
    });

    it('should support the media property when attaching a new relation', function () {
        const cssAsset = new AssetGraph().addAsset({
            type: 'Css',
            url: 'http://example.com/styles.css',
            text: 'body { color: maroon; }'
        });
        cssAsset.addRelation({
            type: 'CssImport',
            media: 'projection',
            to: {
                type: 'Css',
                url: 'http://example.com/moreStyles.css',
                text: 'body { color: maroon; }'
            }
        }, 'last');
        expect(cssAsset.text, 'to contain', 'import "moreStyles.css"projection;');
    });
});
