/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    _ = require('lodash'),
    AssetGraph = require('../../lib');

describe('relations/CssImage', function () {
    it('should handle a test case with a bunch of different CssImage relations', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/CssImage/combo/'})
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
        new AssetGraph({root: __dirname + '/../../testdata/relations/CssImage/mouseCursors/'})
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

    it('should handle a test case with a CssImage relation inside a @media rule', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/CssImage/mediaRule/'})
            .loadAssets('relationInMediaRule.css')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'CssImage', 2);
            })
            .run(done);
    });

    it('should handle a test case with multiple CSS filter urls', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/CssImage/filter/'})
            .loadAssets('index.css')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain asset', 'Css', 1);
                expect(assetGraph, 'to contain assets', {type: 'Svg', isLoaded: true}, 3);
                expect(assetGraph, 'to contain asset', {type: 'Svg', isInline: true});
            })
            .run(done);
    });

    it('should handle a test case with a singlequote in a background-image url(...)', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/CssImage/singleQuoteInUrl/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', {type: 'Png'}, 4);
                assetGraph.findRelations({type: 'CssImage'}).forEach(function (cssImage) {
                   cssImage.to.url += '.bogus';
                });
                var text = assetGraph.findAssets({type: 'Css'})[0].text;
                expect
                    .it('to contain', '\'foo%27bar.png.bogus\'')
                    .and('to contain', '\'bar%27quux.png.bogus\'')
                    .and('to contain', '\'blah%22baz.png.bogus\'')
                    .and('to contain', '\'blerg%22zyp.png.bogus\'')
                    (text);
            })
            .run(done);
    });
});
