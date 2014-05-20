var expect = require('../unexpected-with-plugins'),
    urlTools = require('urltools'),
    AssetGraph = require('../../lib');

describe('transforms/setHtmlImageDimensions', function () {
    it('should handle a simple test case', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/setHtmlImageDimensions/'})
            .loadAssets('index.html')
            .populate()
            .setHtmlImageDimensions()
            .queue(function (assetGraph) {
                var node = assetGraph.findRelations({type: 'HtmlImage', to: {url: /\/foo\.png$/}})[0].node;
                expect(node.getAttribute('width'), 'to equal', '12');
                expect(node.getAttribute('height'), 'to equal', '5');

                node = assetGraph.findRelations({type: 'HtmlImage', to: {url: /\/bar\.jpg$/}})[0].node;
                expect(node.getAttribute('width'), 'to equal', '20');
                expect(node.getAttribute('height'), 'to equal', '20');

                node = assetGraph.findRelations({type: 'HtmlImage', to: {url: /\/quux\.gif$/}})[0].node;
                expect(node.getAttribute('width'), 'to equal', '15');
                expect(node.getAttribute('height'), 'to equal', '15');

                var htmlImages = assetGraph.findRelations({type: 'HtmlImage', to: {url: /\/foo\.png$/}});
                expect(htmlImages[1].node.hasAttribute('height'), 'to equal', false);
                expect(htmlImages[1].node.getAttribute('width'), 'to equal', '123');
                expect(htmlImages[2].node.hasAttribute('width'), 'to equal', false);
                expect(htmlImages[2].node.getAttribute('height'), 'to equal', '123');
                expect(htmlImages[3].node.getAttribute('width'), 'to equal', '123');
                expect(htmlImages[3].node.getAttribute('height'), 'to equal', '123');
            })
            .run(done);
    });
});
