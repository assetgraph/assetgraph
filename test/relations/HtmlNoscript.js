/*global describe, it*/
var expect = require('../unexpected-with-plugins');
var AssetGraph = require('../../lib');

describe('relations/HtmlNoscript', function () {
    it('should handle a test case with an existing <noscript>', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlNoscript/'})
            .loadAssets('index.html')
            .populate()
            .then(function (assetGraph) {
                expect(assetGraph, 'to contain relation', 'HtmlNoscript');

                expect(assetGraph, 'to contain assets', 3);

                expect(assetGraph, 'to contain assets', 'Html', 2);
                expect(assetGraph, 'to contain asset', 'Css');

                var noscriptDoc = assetGraph.findRelations({type: 'HtmlNoscript'})[0].to.parseTree;
                expect(noscriptDoc.innerHTML, 'to match', /^\s+<style[\s\S]+<\/style>\s+$/);
            });
    });

    it('should support attaching itself to an existing document', function () {
        var assetGraph = new AssetGraph();
        var htmlAsset = new AssetGraph.Html({
            type: 'Html',
            text: '<html><body></body></html>'
        });

        assetGraph.addAsset(htmlAsset);

        var relation = new AssetGraph.HtmlNoscript({
            to: new AssetGraph.Html({
                text: '<marquee>hey</marquee>'
            })
        });

        assetGraph.addAsset(relation.to);

        relation.attachToHead(htmlAsset, 'first', htmlAsset);

        relation.inline();

        expect(htmlAsset.text, 'to contain', '<head><noscript><marquee>hey</marquee></noscript></head>');

        var noscriptDoc = assetGraph.findRelations({type: 'HtmlNoscript'})[0].to.parseTree;
        expect(noscriptDoc.innerHTML, 'to equal', '<marquee>hey</marquee>');
    });
});
