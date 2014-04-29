var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib'),
    query = AssetGraph.query;

vows.describe('Compiling Stylus to CSS').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/compileStylusToCss/'})
                .loadAssets('example.styl')
                .populate()
                .run(this.callback);
        },
        'the graph should contain one Stylus asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Stylus');
        },
        'then run the compileStylusToCss transform': {
            topic: function (assetGraph) {
                assetGraph.compileStylusToCss({type: 'Stylus'}).run(this.callback);
            },
            'the graph should contain no Stylus assets': function (assetGraph) {
                expect(assetGraph, 'to contain no assets', 'Stylus');
            },
            'the graph should contain one Css asset': function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Css');
            },
            'then get the Css as text': {
                topic: function (assetGraph) {
                    return assetGraph.findAssets({type: 'Css'})[0].text;
                },
                'the Css should be the output of the less compiler': function (cssText) {
                    expect(cssText, 'to equal',
                        'body {\n' +
                        '  color: #f00;\n' +
                        '}\n' +
                        'body a {\n' +
                        '  font: 12px/1.4 "Lucida Grande", Arial, sans-serif;\n' +
                        '  background: #000;\n' +
                        '  color: #ccc;\n' +
                        '}\n' +
                        'form input {\n' +
                        '  padding: 5px;\n' +
                        '  border: 1px solid;\n' +
                        '  -webkit-border-radius: 5px;\n' +
                        '  -moz-border-radius: 5px;\n' +
                        '  border-radius: 5px;\n' +
                        '}\n'
                    );
                }
            }
        }
    }
})['export'](module);
