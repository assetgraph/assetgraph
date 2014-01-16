var vows = require('vows'),
    assert = require('assert'),
    urlTools = require('url-tools'),
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
            assert.equal(node.getAttribute('width'), '12');
            assert.equal(node.getAttribute('height'), '5');
        },
        'the HtmlImage relation pointing at bar.jpg should have its dimensions specified': function (assetGraph) {
            var node = assetGraph.findRelations({type: 'HtmlImage', to: {url: /\/bar\.jpg$/}})[0].node;
            assert.equal(node.getAttribute('width'), '20');
            assert.equal(node.getAttribute('height'), '20');
        },
        'the HtmlImage relation pointing at quux.gif should have its dimensions specified': function (assetGraph) {
            var node = assetGraph.findRelations({type: 'HtmlImage', to: {url: /\/quux\.gif$/}})[0].node;
            assert.equal(node.getAttribute('width'), '15');
            assert.equal(node.getAttribute('height'), '15');
        },
        'the width and height attributes for the last 3 HtmlImage relations pointing at foo.png should be left untouched': function (assetGraph) {
            var htmlImages = assetGraph.findRelations({type: 'HtmlImage', to: {url: /\/foo\.png$/}});
            assert.equal(htmlImages[1].node.hasAttribute('height'), false);
            assert.equal(htmlImages[1].node.getAttribute('width'), '123');
            assert.equal(htmlImages[2].node.hasAttribute('width'), false);
            assert.equal(htmlImages[2].node.getAttribute('height'), '123');
            assert.equal(htmlImages[3].node.getAttribute('width'), '123');
            assert.equal(htmlImages[3].node.getAttribute('height'), '123');
        }
    }
})['export'](module);
