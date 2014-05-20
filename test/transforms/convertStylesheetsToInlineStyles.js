/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('transforms/convertStylesheetsToInlineStyles', function () {
    it('should convert all stylesheets to inline styles', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/convertStylesheetsToInlineStyles/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 6);
                expect(assetGraph, 'to contain asset', 'Html');
                expect(assetGraph, 'to contain asset', 'Png');
                expect(assetGraph, 'to contain assets', 'Css', 4);
            })
            .convertStylesheetsToInlineStyles({type: 'Html'}, 'screen')
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 7);
                expect(assetGraph, 'to contain no relations', {type: ['HtmlStyle', 'CssImport']});
                expect(assetGraph, 'to contain relations', 'HtmlStyleAttribute', 5);

                var document = assetGraph.findAssets({type: 'Html'})[0].parseTree;
                expect(document.documentElement.getAttribute('style'), 'to equal', 'padding:0');
                expect(document.body.getAttribute('style'), 'to equal', 'padding:0');
                expect(document.querySelectorAll('.a')[0].getAttribute('style'), 'to equal', 'padding:0;color:red;background-image:url(foo.png);background-color:blue');
                expect(document.querySelectorAll('.b')[0].getAttribute('style'), 'to equal', 'padding:0;color:red;background-image:url(foo.png)');
                expect(document.querySelectorAll('.c')[0].getAttribute('style'), 'to equal', 'font-weight:bold;padding:0');
            })
            .run(done);
    });
});
