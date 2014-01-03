var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib');

vows.describe('HtmlIFrameSrcDoc').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlIFrameSrcDoc/'})
                .loadAssets('index.html')
                .populate({
                    followRelations: {to: {url: /^file:/}}
                })
                .run(this.callback);
        },
        'the graph should contain 3 Html assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html'}).length, 3);
        },
        'the graph should contain one inline Html asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html', isInline: true}).length, 1);
        },
        'the graph should contain one HtmlIFrame relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlIFrame'}).length, 1);
        },
        'the graph should contain one HtmlIFrameSrcDoc relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlIFrameSrcDoc'}).length, 1);
        },
        'the graph should contain one HtmlAnchor relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlAnchor'}).length, 1);
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
                assert.matches(assetGraph.findAssets({url: /\/index\.html$/})[0].text, /Hello from the outside!/);
            }
        }
    }
})['export'](module);
