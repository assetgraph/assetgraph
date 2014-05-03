var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib/');

vows.describe('relations.HtmlDart').addBatch({
    'After loading test': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlDart/'})
                .loadAssets('index.html')
                .populate()
                .run(done);
        },
        'the graph should contain 1 HtmlDart relations': function (assetGraph) {
            expect(assetGraph, 'to contain relation');
        },
        'the hrefs of the relation should be correct': function (assetGraph) {
            expect(assetGraph.findRelations()[0].href, 'to equal', 'app.dart');
        },
        'the content of the asset should be correct': function (assetGraph) {
            expect(assetGraph.findAssets({type: 'Dart'})[0].text, 'to equal', "'I am Dart'\n");
        }
    }
})['export'](module);
