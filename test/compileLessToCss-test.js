var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    query = AssetGraph.query;

vows.describe('Compiling LESS to CSS').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/compileLessToCss/'})
                .loadAssets('index.html')
                .populate({followRelations: {to: {url: query.not(/^http:/)}}})
                .run(this.callback);
        },
        'the graph should contain one Less asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Less'}).length, 1);
        },
        'then run the compileLessToCss transform': {
            topic: function (assetGraph) {
                assetGraph.compileLessToCss({type: 'Less'}).run(this.callback);
            },
            'the graph should contain no Less assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'Less'}).length, 0);
            },
            'the graph should contain one Css asset': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'Css'}).length, 1);
            },
            'then get the Html asset as text': {
                topic: function (assetGraph) {
                    return assetGraph.findAssets({type: 'Html'})[0].text;
                },
                'there should be no occurrences of "stylesheet/less"': function (text) {
                    assert.equal(text.indexOf('stylesheet/less'), -1);
                },
                'there should be no occurrences of "styles.less"': function (text) {
                    assert.equal(text.indexOf('styles.less'), -1);
                },
                'there should be a <link rel="stylesheet" href="styles.css">': function (text) {
                    assert.notEqual(text.indexOf('<link rel="stylesheet" href="styles.css" />'), -1);
                }
            },
            'then get the Css as text': {
                topic: function (assetGraph) {
                    return assetGraph.findAssets({type: 'Css'})[0].text;
                },
                'the Css should be the output of the less compiler': function (cssText) {
                    assert.equal(cssText,
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
