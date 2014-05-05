var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/HtmlTemplate', function () {
    it('should handle a test case with an existing <template> element', function (done) {
        new AssetGraph({root: __dirname + '/HtmlTemplate/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'HtmlImage', 3);
                expect(assetGraph, 'to contain relation', 'HtmlTemplate');
                expect(assetGraph, 'to contain relation', 'HtmlStyle');
                expect(assetGraph, 'to contain relation', {
                    type: 'HtmlImage',
                    from: {
                        type: 'Html',
                        isFragment: false
                    }
                });

                expect(assetGraph, 'to contain relations', {
                    type: 'HtmlImage',
                    from: {
                        type: 'Html',
                        isFragment: true
                    }
                }, 2);
            })
            .run(done);
    });
});
