var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib');

vows.describe('transforms.convertStylesheetsToInlineStyles').addBatch({
    'After loading a test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/convertStylesheetsToInlineStyles/'})
                .loadAssets('index.html')
                .populate()
                .run(done);
        },
        'the graph should contain 6 assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 6);
        },
        'the graph should contain 1 Html asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Html');
        },
        'the graph should contain 1 Png asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Png');
        },
        'the graph should contain 4 Css assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'Css', 4);
        },
        'then run the convertStylesheetsToInlineStyles transform with media=screen': {
            topic: function (assetGraph) {
                assetGraph
                    .convertStylesheetsToInlineStyles({type: 'Html'}, 'screen')
                    .run(done);
            },
            'the graph should contain 7 assets': function (assetGraph) {
                expect(assetGraph, 'to contain assets', 7);
            },
            'the graph should contain 0 HtmlStyle and CssImport relations': function (assetGraph) {
                expect(assetGraph, 'to contain no relations', {type: ['HtmlStyle', 'CssImport']});
            },
            'the graph should contain 5 HtmlStyleAttribute relations': function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'HtmlStyleAttribute', 5);
            },
            'the different elements should have the right inline styles applied': function (assetGraph) {
                var document = assetGraph.findAssets({type: 'Html'})[0].parseTree;
                expect(document.documentElement.getAttribute('style'), 'to equal', 'padding:0');
                expect(document.body.getAttribute('style'), 'to equal', 'padding:0');
                expect(document.querySelectorAll('.a')[0].getAttribute('style'), 'to equal', 'padding:0;color:red;background-image:url(foo.png);background-color:blue');
                expect(document.querySelectorAll('.b')[0].getAttribute('style'), 'to equal', 'padding:0;color:red;background-image:url(foo.png)');
                expect(document.querySelectorAll('.c')[0].getAttribute('style'), 'to equal', 'font-weight:bold;padding:0');
            }
        }
    }
})['export'](module);
