/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib/AssetGraph');

describe('transforms/loadAssets', function () {
    it('should support a single url passed as a string', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/loadAssets/'})
            .loadAssets('index.html')
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Html');
                expect(assetGraph, 'to contain asset', 'JavaScript');
            });
    });

    it('should support an array of urls', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/loadAssets/'})
            .loadAssets(['index.html', 'index2.html'])
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Html', 2);
                expect(assetGraph, 'to contain asset', 'JavaScript');
                expect(assetGraph, 'to contain asset', 'Css');
            });
    });

    it('should support multiple urls as varargs', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/loadAssets/'})
            .loadAssets('index.html', 'index2.html')
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Html', 2);
                expect(assetGraph, 'to contain asset', 'JavaScript');
                expect(assetGraph, 'to contain asset', 'Css');
            });
    });

    it('should support an asset config object', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/loadAssets/'})
            .loadAssets({
                type: 'Html',
                url: 'http://example.com/index.html',
                text: '<!DOCTYPE html><html><head></head><body><script>alert("Hello!");</script></body></html>'
            })
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Html');
                expect(assetGraph, 'to contain asset', 'JavaScript');
            });
    });

    it('should support the keepUnpopulated option', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/loadAssets/'})
            .loadAssets({
                type: 'Html',
                keepUnpopulated: true,
                url: 'http://example.com/index.html',
                text: '<!DOCTYPE html><html><head></head><body><script>alert("Hello!");</script></body></html>'
            })
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Html');
                expect(assetGraph, 'to contain no assets', 'JavaScript');
                expect(assetGraph.findAssets({type: 'Html'})[0], 'not to have property', '_parseTree');
            });
    });
});
