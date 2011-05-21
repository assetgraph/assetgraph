var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = require('../lib/transforms'),
    query = require('../lib/query');

vows.describe('Compiling CoffeeScript to JavaScript').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/compileCoffeeScriptToJavaScript/'}).transform(
                transforms.loadAssets('index.html'),
                transforms.populate({to: query.not(/^http:/)}),
                this.callback
            );
        },
        'the graph should contain two CoffeeScript assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'CoffeeScript'}).length, 2);
        },
        'then run the compileCoffeeScriptToJavaScript transform': {
            topic: function (assetGraph) {
                assetGraph.transform(
                    transforms.compileCoffeeScriptToJavaScript({type: 'CoffeeScript'}),
                    this.callback
                );
            },
            'the graph should contain no CoffeeScript assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'CoffeeScript'}).length, 0);
            },
            'the graph should contain two JavaScript assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 2);
            },
            'then get the HTML asset as text': {
                topic: function (assetGraph) {
                    assetGraph.getAssetText(assetGraph.findAssets({type: 'HTML'})[0], this.callback);
                },
                'there should be no occurrences of "text/coffeescript"': function (text) {
                    assert.equal(text.indexOf('text/coffeescript'), -1);
                }
            }
        }
    }
})['export'](module);
