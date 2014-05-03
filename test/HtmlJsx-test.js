var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    _ = require('underscore'),
    AssetGraph = require('../lib');

vows.describe('relations.HtmlJsx').addBatch({
    'After loading test': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlJsx/'})
                .loadAssets('index.html')
                .populate()
                .run(done);
        },
        'the graph should contain 2 HtmlJsx relations': function (assetGraph) {
            expect(assetGraph, 'to contain relations including unresolved', 'HtmlJsx', 2);
        },
        'the hrefs of the relations should be correct': function (assetGraph) {
            expect(_.pluck(assetGraph.findRelations(), 'href'), 'to equal',
                             [
                                 'externalWithTypeTextJsx.js',
                                 undefined
                             ]);
        },
        'the content of the assets should be correct': function (assetGraph) {
            var assets = _.pluck(assetGraph.findRelations(), 'to');

            expect(assets[0].text, 'to equal', "'external'\n");
            expect(assets[1].text, 'to equal', "'inline'");
        }
    }
})['export'](module);
