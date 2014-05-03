var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib'),
    query = AssetGraph.query;

vows.describe('Inlining relations').addBatch({
    'After loading a test case with an Html asset that has an external Css asset in a conditional comment': {
        topic: function () {
            new AssetGraph({root: __dirname + '/inlineRelations/'})
                .loadAssets('index.html')
                .populate()
                .run(done);
        },
        'the graph should contain 4 assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 4);
        },
        'the graph should contain 2 Html assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'Html', 2);
        },
        'the graph should contain one Css asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Css');
        },
        'the graph should contain one Png asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Png');
        },
        'then inlining the Css and getting the Html as text': {
            topic: function (assetGraph) {
                assetGraph.findRelations({type: 'HtmlStyle'})[0].inline();
                return assetGraph;
            },
            'there should be exactly one inline Css asset': function (assetGraph) {
                expect(assetGraph, 'to contain asset', {type: 'Css', isInline: true});
            },
            'the CssImage href should be relative to the Html asset': function (assetGraph) {
                expect(assetGraph.findRelations({type: 'CssImage'})[0].href, 'to equal', 'some/directory/foo.png');
            },
            'the CssImage as found in the reserialized text of the Html asset should be relative to the Html asset': function (assetGraph) {
                var text = assetGraph.findAssets({type: 'Html'})[0].text,
                    matches = text.match(/url\((.*?foo\.png)\)/g);
                expect(matches, 'to be an array');
                expect(matches[1], 'to equal', "url(some\/directory\/foo.png)");
                expect(matches, 'to have length', 2);
            }
        }
    }
})['export'](module);
