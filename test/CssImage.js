var expect = require('./unexpected-with-plugins'),
    _ = require('underscore'),
    AssetGraph = require('../lib');

describe('CssImage', function () {
    it('should handle a test case with a bunch of different CssImage relations', function (done) {
        new AssetGraph({root: __dirname + '/CssImage/combo/'})
            .loadAssets('index.css')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'CssImage', 17);
                assetGraph.findAssets({url: /\/foo\.png$/})[0].url = assetGraph.root + 'dir/foo2.png';

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

                expect(assetGraph.findAssets({url: /\/index\.css$/})[0].text, 'to match', /\.baz{background-image:url\(dir\/foo2\.png\)!important/);
            })
            .run(done);
    });


    it('should handle a test case with three CssImage relations pointing at mouse cursors', function (done) {
        new AssetGraph({root: __dirname + '/CssImage/mouseCursors/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 5);
                expect(assetGraph, 'to contain asset', 'Html');
                expect(assetGraph, 'to contain asset', 'Css');
                expect(assetGraph, 'to contain assets', 'Png', 3);
                expect(assetGraph, 'to contain relations', 'CssImage', 3);
            })
            .run(done);
    });
});
