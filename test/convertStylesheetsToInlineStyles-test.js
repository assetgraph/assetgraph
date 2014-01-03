var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib');

vows.describe('transforms.convertStylesheetsToInlineStyles').addBatch({
    'After loading a test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/convertStylesheetsToInlineStyles/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 6 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 6);
        },
        'the graph should contain 1 Html asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html'}).length, 1);
        },
        'the graph should contain 1 Png asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Png'}).length, 1);
        },
        'the graph should contain 4 Css assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Css'}).length, 4);
        },
        'then run the convertStylesheetsToInlineStyles transform with media=screen': {
            topic: function (assetGraph) {
                assetGraph
                    .convertStylesheetsToInlineStyles({type: 'Html'}, 'screen')
                    .run(this.callback);
            },
            'the graph should contain 7 assets': function (assetGraph) {
                assert.equal(assetGraph.findAssets().length, 7);
            },
            'the graph should contain 0 HtmlStyle and CssImport relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: ['HtmlStyle', 'CssImport']}).length, 0);
            },
            'the graph should contain 5 HtmlStyleAttribute relations': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlStyleAttribute'}).length, 5);
            },
            'the different elements should have the right inline styles applied': function (assetGraph) {
                var document = assetGraph.findAssets({type: 'Html'})[0].parseTree;
                assert.equal(document.documentElement.getAttribute('style'), 'padding:0');
                assert.equal(document.body.getAttribute('style'), 'padding:0');
                assert.equal(document.querySelectorAll('.a')[0].getAttribute('style'), 'padding:0;color:red;background-image:url(foo.png);background-color:blue');
                assert.equal(document.querySelectorAll('.b')[0].getAttribute('style'), 'padding:0;color:red;background-image:url(foo.png)');
                assert.equal(document.querySelectorAll('.c')[0].getAttribute('style'), 'font-weight:bold;padding:0');
            }
        }
    }
})['export'](module);
