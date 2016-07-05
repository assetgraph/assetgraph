/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    _ = require('lodash'),
    AssetGraph = require('../../lib');

describe('relations/JavaScriptGetStaticUrl', function () {
    it('should handle root relative urls in a GETSTATICURL', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptGetStaticUrl/rootRelative/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(_.map(assetGraph.findRelations({type: 'JavaScriptGetStaticUrl'}), 'href'), 'to equal', [
                    '/images/foo.png'
                ]);
            });
    });

    describe('#omitFunctionCall', function () {
        it('should replace GETSTATICURL("...") with "..."', function () {
            return new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptGetStaticUrl/omitFunctionCall/'})
                .loadAssets('index.html')
                .populate()
                .queue(function (assetGraph) {
                    expect(assetGraph.findRelations({type: 'JavaScriptGetStaticUrl'})[0].href, 'to equal', '/bar.png');
                    expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to contain', "GETSTATICURL('/bar.png')");
                    assetGraph.findRelations({type: 'JavaScriptGetStaticUrl'})[0].omitFunctionCall();
                    expect(assetGraph.findRelations({type: 'JavaScriptGetStaticUrl'})[0].href, 'to equal', '/bar.png');
                    expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'not to contain', "GETSTATICURL('/bar.png')")
                        .and('to contain', "var foo = '/bar.png'");
                    assetGraph.findRelations({type: 'JavaScriptGetStaticUrl'})[0].href = '/quux.png';
                    assetGraph.findRelations({type: 'JavaScriptGetStaticUrl'})[0].from.markDirty();
                    expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to contain', "var foo = '/quux.png'");
                });
        });
    });
});
