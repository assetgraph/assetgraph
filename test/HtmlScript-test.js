var vows = require('vows'),
    assert = require('assert'),
    _ = require('underscore'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = AssetGraph.transforms,
    query = AssetGraph.query;

vows.describe('relations.HtmlScript').addBatch({
    'After loading test': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlScript/'}).queue(
                transforms.loadAssets('index.html'),
                transforms.populate()
            ).run(this.callback);
        },
        'the graph should contain 6 HtmlScript relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlScript'}, true).length, 6);
        },
        'the hrefs of the relations should be correct': function (assetGraph) {
            assert.deepEqual(_.pluck(assetGraph.findRelations(), 'href'),
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
