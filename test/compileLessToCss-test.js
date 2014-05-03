var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib'),
    query = AssetGraph.query;

vows.describe('Compiling LESS to CSS').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/compileLessToCss/'})
                .loadAssets('index.html')
                .populate({followRelations: {to: {url: query.not(/^http:/)}}})
                .run(done);
        },
        'the graph should contain one Less asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Less');
        },
        'then run the compileLessToCss transform': {
            topic: function (assetGraph) {
                assetGraph.compileLessToCss({type: 'Less'}).run(done);
            },
            'the graph should contain no Less assets': function (assetGraph) {
                expect(assetGraph, 'to contain no assets', 'Less');
            },
            'the graph should contain one Css asset': function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Css');
            },
            'then get the Html asset as text': {
                topic: function (assetGraph) {
                    return assetGraph.findAssets({type: 'Html'})[0].text;
                },
                'there should be no occurrences of "stylesheet/less"': function (text) {
                    expect(text, 'not to contain', 'stylesheet/less');
                },
                'there should be no occurrences of "styles.less"': function (text) {
                    expect(text, 'not to contain', 'styles.less');
                },
                'there should be a <link rel="stylesheet" href="styles.css">': function (text) {
                    expect(text, 'to contain', '<link rel="stylesheet" href="styles.css">');
                }
            },
            'then get the Css as text': {
                topic: function (assetGraph) {
                    return assetGraph.findAssets({type: 'Css'})[0].text;
                },
                'the Css should be the output of the less compiler': function (cssText) {
                    expect(cssText, 'to equal',
                        '#header {\n' +
                        '  color: #333333;\n' +
                        '  border-left: 1px;\n' +
                        '  border-right: 2px;\n' +
                        '}\n' +
                        '#footer {\n' +
                        '  color: #114411;\n' +
                        '  border-color: #7d2717;\n' +
                        '}\n'
                    );
                }
            }
        }
    }
})['export'](module);
