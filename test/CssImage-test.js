var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    _ = require('underscore'),
    AssetGraph = require('../lib');

vows.describe('CssImage').addBatch({
    'After loading a test case with a bunch of different CssImage relations': {
        topic: function () {
            new AssetGraph({root: __dirname + '/CssImage/combo/'})
                .loadAssets('index.css')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 17 CssImage relations': function (assetGraph) {
            expect(assetGraph, 'to contain relations', 'CssImage', 17);
        },
        'then move foo.png to a different url': {
            topic: function (assetGraph) {
                assetGraph.findAssets({url: /\/foo\.png$/})[0].url = assetGraph.root + 'dir/foo2.png';
                return assetGraph;
            },
            'the references to it should be updated': function (assetGraph) {
                expect(_.pluck(assetGraph.findRelations({to: assetGraph.findAssets({url: /\/foo2\.png$/})}), 'href'), 'to equal', [
                    'dir/foo2.png',
                    'dir/foo2.png',
                    'dir/foo2.png',
                    'dir/foo2.png',
                    'dir/foo2.png',
                    'dir/foo2.png',
                    'dir/foo2.png',
                    'dir/foo2.png',
                    'dir/foo2.png',
                    'dir/foo2.png',
                    'dir/foo2.png',
                    'dir/foo2.png',
                    'dir/foo2.png',
                    'dir/foo2.png',
                    'dir/foo2.png',
                    'dir/foo2.png',
                    'dir/foo2.png'
                ]);
            },
            'the !important marker on the .baz background-image should still be there': function (assetGraph) {
                expect(assetGraph.findAssets({url: /\/index\.css$/})[0].text, 'to match', /\.baz{background-image:url\(dir\/foo2\.png\)!important/);
            }
        }
    },
    'After loading a test case with three CssImage relations pointing at mouse cursors': {
        topic: function () {
            new AssetGraph({root: __dirname + '/CssImage/mouseCursors/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 5 assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 5);
        },
        'the graph should contain one Html asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Html');
        },
        'the graph should contain one Css asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Css');
        },
        'the graph should contain 3 Png assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'Png', 3);
        },
        'the graph should contain 3 CssImage relations': function (assetGraph) {
            expect(assetGraph, 'to contain relations', 'CssImage', 3);
        }
    }
})['export'](module);
