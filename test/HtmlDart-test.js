var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/');

vows.describe('relations.HtmlDart').addBatch({
    'After loading test': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlDart/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 1 HtmlDart relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations().length, 1);
        },
        'the hrefs of the relation should be correct': function (assetGraph) {
            assert.equal(assetGraph.findRelations()[0].href, 'app.dart');
        },
        'the content of the asset should be correct': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Dart'})[0].text, "'I am Dart'\n");
        }
    }
})['export'](module);
