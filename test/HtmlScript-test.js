var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    _ = require('underscore'),
    AssetGraph = require('../lib'),
    query = AssetGraph.query;

vows.describe('relations.HtmlScript').addBatch({
    'After loading test': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlScript/'})
                .loadAssets('index.html')
                .populate()
                .run(done);
        },
        'the graph should contain 6 HtmlScript relations': function (assetGraph) {
            expect(assetGraph, 'to contain relations including unresolved', 'HtmlScript', 6);
        },
        'the hrefs of the relations should be correct': function (assetGraph) {
            expect(_.pluck(assetGraph.findRelations(), 'href'), 'to equal',
                             [
                                 'externalNoType.js',
                                 undefined,
                                 'externalWithTypeTextJavaScript.js',
                                 undefined,
                                 'externalWithTypeTextCoffeeScript.js',
                                 undefined
                             ]);
        }
    }
})['export'](module);
