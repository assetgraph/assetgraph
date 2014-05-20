/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/HtmlStyleAttribute', function () {
    it('should handle a test case with existing <link rel="stylesheet"> and <style> elements', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlStyleAttribute/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 4);
                expect(assetGraph, 'to contain asset', 'Html');
                expect(assetGraph, 'to contain relations', 'HtmlStyleAttribute', 2);
                expect(assetGraph, 'to contain relation', 'CssImage');
                expect(assetGraph, 'to contain asset', 'Png');
            })
            .inlineRelations({type: 'CssImage'})
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({type: 'Html'})[0].text, 'to match', /data:/);

                var cssAsset = assetGraph.findAssets({type: 'Css'})[0];
                cssAsset.parseTree.cssRules[0].style.setProperty('line-height', '200%');
                cssAsset.markDirty();
                expect(assetGraph.findAssets({type: 'Html'})[0].text, 'to match', /line-height:/);

                cssAsset = assetGraph.findAssets({type: 'Css'})[1];
                cssAsset.parseTree.cssRules[0].style.setProperty('line-height', '200%');
                cssAsset.markDirty();
                expect(assetGraph.findAssets({type: 'Html'})[0].text, 'to match', /foo:\s*bar;.*foo:\s*quux/);
            })
            .run(done);
    });
});
