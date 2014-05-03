var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib');

vows.describe('HtmlInlineEventHandler test').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlInlineEventHandler/'})
                .loadAssets('index.html')
                .populate()
                .run(done);
        },
        'the graph should contain 4 assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 4);
        },
        'the graph should contain 1 Html asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Html');
        },
        'the graph should contain 3 JavaScript assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'JavaScript', 3);
        },
        'the graph should contain 3 HtmlInlineEventHandler relations': function (assetGraph) {
            expect(assetGraph, 'to contain relations', 'HtmlInlineEventHandler', 3);
        },
        'then update the text of each JavaScript asset': {
            topic: function (assetGraph) {
                assetGraph.findAssets({type: 'JavaScript'}).forEach(function (javaScript) {
                    javaScript.text = javaScript.text.replace(/this/g, 'that');
                });
                return assetGraph;
            },
            'the Html should be updated': function (assetGraph) {
                expect(assetGraph.findAssets({type: 'Html'})[0].text, 'to match', /that\.focused.*that\.focused/);
            }
        }
    }
})['export'](module);
