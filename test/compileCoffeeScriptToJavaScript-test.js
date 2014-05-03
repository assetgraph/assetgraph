var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib'),
    query = AssetGraph.query;

vows.describe('Compiling CoffeeScript to JavaScript').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/compileCoffeeScriptToJavaScript/'})
                .loadAssets('index.html')
                .populate({followRelations: {to: {url: query.not(/^http:/)}}})
                .queue(function (assetGraph) {
                })
                .run(done);
        },
        'the graph should contain two CoffeeScript assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'CoffeeScript', 2);
        },
        'then run the compileCoffeeScriptToJavaScript transform': {
            topic: function (assetGraph) {
                assetGraph.compileCoffeeScriptToJavaScript({type: 'CoffeeScript'}).run(done);
            },
            'the graph should contain no CoffeeScript assets': function (assetGraph) {
                expect(assetGraph, 'to contain no assets', 'CoffeeScript');
            },
            'the graph should contain two JavaScript assets': function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 2);
            },
            'then get the Html asset as text': {
                topic: function (assetGraph) {
                    return assetGraph.findAssets({type: 'Html'})[0].text;
                },
                'there should be no occurrences of "text/coffeescript"': function (text) {
                    expect(text, 'not to contain', 'text/coffeescript');
                },
                'there should be no occurrences of "index.coffee"': function (text) {
                    expect(text, 'not to contain', 'index.coffee');
                },
                'there should be a <script src="index.js">': function (text) {
                    expect(text, 'to contain', '<script src="index.js">');
                }
            }
        }
    }
})['export'](module);
