var vows = require('vows'),
    assert = require('assert'),
    _ = require('underscore'),
    AssetGraph = require('../lib/AssetGraph');

vows.describe('relations.HtmlJsx').addBatch({
    'After loading test': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlJsx/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 2 HtmlJsx relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlJsx'}, true).length, 2);
        },
        'the hrefs of the relations should be correct': function (assetGraph) {
            assert.deepEqual(_.pluck(assetGraph.findRelations(), 'href'),
                             [
                                 'externalWithTypeTextJsx.js',
                                 undefined
                             ]);
        },
        'the content of the assets should be correct': function (assetGraph) {
            var assets = _.pluck(assetGraph.findRelations(), 'to');

            assert.equal(assets[0].text, "'external'\n");
            assert.equal(assets[1].text, "'inline'");
        }
    }
})['export'](module);
