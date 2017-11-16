/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('relations/HtmlNoscript', function () {
    it('should handle a test case with an existing <noscript>', async function () {
        const assetGraph = new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlNoscript/'});
        await assetGraph.loadAssets('index.html')
            .populate();

        expect(assetGraph, 'to contain relation', 'HtmlNoscript');

        expect(assetGraph, 'to contain assets', 3);

        expect(assetGraph, 'to contain assets', 'Html', 2);
        expect(assetGraph, 'to contain asset', 'Css');

        const noscriptDoc = assetGraph.findRelations({type: 'HtmlNoscript'})[0].to.parseTree;
        expect(noscriptDoc.innerHTML, 'to match', /^\s+<style[\s\S]+<\/style>\s+$/);
    });

    it('should support attaching itself to an existing document', function () {
        const assetGraph = new AssetGraph();
        const htmlAsset = assetGraph.addAsset({
            type: 'Html',
            text: '<html><body></body></html>'
        });
        htmlAsset.addRelation({
            type: 'HtmlNoscript',
            to: {
                type: 'Html',
                text: '<marquee>hey</marquee>'
            }
        }, 'lastInBody');
        expect(htmlAsset.text, 'to contain', '<body><noscript><marquee>hey</marquee></noscript></body>');

        const noscriptDoc = assetGraph.findRelations({type: 'HtmlNoscript'})[0].to.parseTree;
        expect(noscriptDoc.innerHTML, 'to equal', '<marquee>hey</marquee>');
    });
});
