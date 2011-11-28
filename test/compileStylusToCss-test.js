var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib/AssetGraph'),
    transforms = AssetGraph.transforms,
    query = AssetGraph.query;

vows.describe('Compiling Stylus to CSS').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/compileStylusToCss/'}).queue(
                transforms.loadAssets('example.styl'),
                transforms.populate()
            ).run(this.callback);
        },
        'the graph should contain one Stylus asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Stylus'}).length, 1);
        },
        'then run the compileStylusToCss transform': {
            topic: function (assetGraph) {
                assetGraph.runTransform(transforms.compileStylusToCss({type: 'Stylus'}), this.callback);
            },
            'the graph should contain no Stylus assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'Stylus'}).length, 0);
            },
            'the graph should contain one Css asset': function (assetGraph) {
                assert.equal(assetGraph.findAssets({type: 'Css'}).length, 1);
            },
            'then get the Css as text': {
                topic: function (assetGraph) {
                    return assetGraph.findAssets({type: 'Css'})[0].text;
                },
                'the Css should be the output of the less compiler': function (cssText) {
                    assert.equal(cssText,
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
