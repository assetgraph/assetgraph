var vows = require('vows'),
    assert = require('assert'),
    _ = require('underscore'),
    AssetGraph = require('../lib/AssetGraph');

vows.describe('CssImage').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/CssImage/'})
                .loadAssets('index.css')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 10 CssImage relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'CssImage'}).length, 10);
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
                    'dir/foo2.png'
                ]);
            },
            'the !important marker on the .baz background-image should still be there': function (assetGraph) {
                assert.matches(assetGraph.findAssets({url: /\/index\.css$/})[0].text, /\.baz{background-image:url\(dir\/foo2\.png\)!important/);
            }
        }
    }
})['export'](module);
