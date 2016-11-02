var expect = require('../unexpected-with-plugins');
var AssetGraph = require('../../lib');

describe('tranforms/inlineCriticalCss', function () {
    it('should inline the heading style of a simple test case', function () {
        return new AssetGraph({ root: __dirname + '/../../testdata/transforms/inlineCriticalCss/' })
            .loadAssets('simple.html')
            .populate()
            .inlineCriticalCss()
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({ type: 'Css' }), 'to satisfy', [
                    {
                        inline: true,
                        text: 'h1{color:red}',
                        node: function (node) {
                            return node && node.parentNode && node.parentNode.tagName === 'HEAD';
                        }
                    },
                    {
                        fileName: 'simple.css'
                    }
                ]);
            });
    });
});
