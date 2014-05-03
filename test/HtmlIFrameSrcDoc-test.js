var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib');

vows.describe('HtmlIFrameSrcDoc').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlIFrameSrcDoc/'})
                .loadAssets('index.html')
                .populate({
                    followRelations: {to: {url: /^file:/}}
                })
                .run(done);
        },
        'the graph should contain 3 Html assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'Html', 3);
        },
        'the graph should contain one inline Html asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', {type: 'Html', isInline: true});
        },
        'the graph should contain one HtmlIFrame relation': function (assetGraph) {
            expect(assetGraph, 'to contain relation', 'HtmlIFrame');
        },
        'the graph should contain one HtmlIFrameSrcDoc relation': function (assetGraph) {
            expect(assetGraph, 'to contain relation', 'HtmlIFrameSrcDoc');
        },
        'the graph should contain one HtmlAnchor relation': function (assetGraph) {
            expect(assetGraph, 'to contain relation', 'HtmlAnchor');
        },
        'then updating the inline Html asset pointed to by the HtmlIFrameSrcDoc relation': {
            topic: function (assetGraph) {
                var asset = assetGraph.findRelations({type: 'HtmlIFrameSrcDoc'})[0].to,
                    document = asset.parseTree;
                document.firstChild.appendChild(document.createTextNode('Hello from the outside!'));
                asset.markDirty();
                return assetGraph;
            },
            'the serialization of the containing document should contain the inserted text': function (assetGraph) {
                expect(assetGraph.findAssets({url: /\/index\.html$/})[0].text, 'to match', /Hello from the outside!/);
            }
        }
    }
})['export'](module);
