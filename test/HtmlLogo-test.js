var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib');

vows.describe('HtmlLogo').addBatch({
    'After loading a test case with a <link rel="logo" href="...">': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlLogo/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 1 HtmlLogo relation': function (assetGraph) {
            expect(assetGraph, 'to contain relation', 'HtmlLogo');
        },
        'the graph should contain 1 Svg asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Svg');
        },
        'then update the url of the logo': {
            topic: function (assetGraph) {
                assetGraph.findAssets({type: 'Svg'})[0].url = 'http://example.com/otherLogo.png';
                return assetGraph;
            },
            'the text of the Html asset should be updated': function (assetGraph) {
                expect(assetGraph.findAssets({type: 'Html'})[0].text, 'to match', /otherLogo\.png/);
            }
        }
    }
})['export'](module);
