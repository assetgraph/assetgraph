var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    urlTools = require('urltools'),
    AssetGraph = require('../lib');

vows.describe('transforms.setHtmlImageDimensions').addBatch({
    'After loading a test case and running the setHtmlImageDimensions transform': {
        topic: function () {
            new AssetGraph({root: __dirname + '/setHtmlImageDimensions/'})
                .loadAssets('index.html')
                .populate()
                .setHtmlImageDimensions()
                .run(this.callback);
        },
        'the first HtmlImage relation pointing at foo.png should have its dimensions specified': function (assetGraph) {
            var node = assetGraph.findRelations({type: 'HtmlImage', to: {url: /\/foo\.png$/}})[0].node;
            expect(node.getAttribute('width'), 'to equal', '12');
            expect(node.getAttribute('height'), 'to equal', '5');
        },
        'the HtmlImage relation pointing at bar.jpg should have its dimensions specified': function (assetGraph) {
            var node = assetGraph.findRelations({type: 'HtmlImage', to: {url: /\/bar\.jpg$/}})[0].node;
            expect(node.getAttribute('width'), 'to equal', '20');
            expect(node.getAttribute('height'), 'to equal', '20');
        },
        'the HtmlImage relation pointing at quux.gif should have its dimensions specified': function (assetGraph) {
            var node = assetGraph.findRelations({type: 'HtmlImage', to: {url: /\/quux\.gif$/}})[0].node;
            expect(node.getAttribute('width'), 'to equal', '15');
            expect(node.getAttribute('height'), 'to equal', '15');
        },
        'the width and height attributes for the last 3 HtmlImage relations pointing at foo.png should be left untouched': function (assetGraph) {
            var htmlImages = assetGraph.findRelations({type: 'HtmlImage', to: {url: /\/foo\.png$/}});
            expect(htmlImages[1].node.hasAttribute('height'), 'to equal', false);
            expect(htmlImages[1].node.getAttribute('width'), 'to equal', '123');
            expect(htmlImages[2].node.hasAttribute('width'), 'to equal', false);
            expect(htmlImages[2].node.getAttribute('height'), 'to equal', '123');
            expect(htmlImages[3].node.getAttribute('width'), 'to equal', '123');
            expect(htmlImages[3].node.getAttribute('height'), 'to equal', '123');
        }
    }
})['export'](module);
