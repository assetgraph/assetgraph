var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = require('../lib/transforms');

vows.describe('executeJavaScriptConditionalBlocks').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/runJavaScriptConditionalBlocks'}).transform(
                transforms.loadAssets('index.html'),
                transforms.populate(),
                transforms.escapeToCallback(this.callback)
            );
        },
        'the graph should contain a JavaScriptConditionalBlock relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'JavaScriptConditionalBlock'}).length, 1);
        },
        'then running the conditional blocks': {
            topic: function (assetGraph) {
                assetGraph.transform(
                    transforms.runJavaScriptConditionalBlocks({type: 'HTML'}, 'theEnvironment'),
                    transforms.escapeToCallback(this.callback)
                );
            },
            'the HTML should contain a new <div> with a greeting from the conditional block': function (assetGraph) {
                var html = assetGraph.findAssets({type: 'HTML'})[0],
                    divs = html.parseTree.getElementsByTagName('div');
                assert.equal(divs.length, 1);
                assert.equal(divs[0].firstChild.nodeValue, "Howdy");
            }
        }
    }
})['export'](module);
