var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib'),
    query = AssetGraph.query;

vows.describe('Compiling CoffeeScript to JavaScript').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/compileCoffeeScriptToJavaScript/'})
                .loadAssets('index.html')
                .populate({followRelations: {to: {url: query.not(/^http:/)}}})
                .run(this.callback);
        },
        'the graph should contain two CoffeeScript assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'CoffeeScript'}).length, 2);
        },
        'then run the compileCoffeeScriptToJavaScript transform': {
            topic: function (assetGraph) {
                assetGraph.compileCoffeeScriptToJavaScript({type: 'CoffeeScript'}).run(this.callback);
            },
            'the graph should contain no CoffeeScript assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'CoffeeScript'}).length, 0);
            },
            'the graph should contain two JavaScript assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'JavaScript'}).length, 2);
            },
            'then get the Html asset as text': {
                topic: function (assetGraph) {
                    return assetGraph.findAssets({type: 'Html'})[0].text;
                },
                'there should be no occurrences of "text/coffeescript"': function (text) {
                    assert.equal(text.indexOf('text/coffeescript'), -1);
                },
                'there should be no occurrences of "index.coffee"': function (text) {
                    assert.equal(text.indexOf('index.coffee'), -1);
                },
                'there should be a <script src="index.js">': function (text) {
                    assert.notEqual(text.indexOf('<script src="index.js">'), -1);
                }
            }
        }
    }
})['export'](module);
