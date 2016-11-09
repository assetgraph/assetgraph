var expect = require('../unexpected-with-plugins');
var AssetGraph = require('../../lib');

describe('tranforms/inlineCriticalCss', function () {
    it('should inline the heading style of a simple test case', function () {
        return new AssetGraph({ root: __dirname + '/../../testdata/transforms/inlineCriticalCss/' })
            .loadAssets('simple.html')
            .populate()
            .inlineCriticalCss()
            .queue(function (assetGraph) {
                expect(assetGraph.findRelations({ type: 'HtmlStyle' }), 'to satisfy', [
                    {
                        to: {
                            isInline: true,
                            text: 'h1 {\n    color: red\n}'
                        },
                        node: function (node) {
                            return node && node.parentNode && node.parentNode.tagName === 'HEAD';
                        }
                    },
                    {
                        to: {
                            fileName: 'simple.css'
                        }
                    }
                ]);
            });
    });
});
