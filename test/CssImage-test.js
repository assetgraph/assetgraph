var vows = require('vows'),
    assert = require('assert'),
    _ = require('underscore'),
    AssetGraph = require('../lib/AssetGraph');

vows.describe('CssImage').addBatch({
    'After loading a test case with a bunch of different CssImage relations': {
        topic: function () {
            new AssetGraph({root: __dirname + '/CssImage/combo/'})
                .loadAssets('index.css')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 16 CssImage relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'CssImage'}).length, 16);
        },
        'then move foo.png to a different url': {
            topic: function (assetGraph) {
                assetGraph.findAssets({url: /\/foo\.png$/})[0].url = assetGraph.root + 'dir/foo2.png';
                return assetGraph;
            },
            'the references to it should be updated': function (assetGraph) {
                assert.deepEqual(_.pluck(assetGraph.findRelations({to: assetGraph.findAssets({url: /\/foo2\.png$/})}), 'href'), [
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
                assert.matches(assetGraph.findAssets({url: /\/index\.css$/})[0].text, /\.baz{background-image:url\(dir\/foo2\.png\)!important/);
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
            assert.equal(assetGraph.findAssets().length, 5);
        },
        'the graph should contain one Html asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html'}).length, 1);
        },
        'the graph should contain one Css asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Css'}).length, 1);
        },
        'the graph should contain 3 Png assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Png'}).length, 3);
        },
        'the graph should contain 3 CssImage relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'CssImage'}).length, 3);
        }
    }
})['export'](module);
