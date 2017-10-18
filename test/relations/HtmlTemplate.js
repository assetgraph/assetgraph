/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('relations/HtmlTemplate', function () {
    it('should handle a test case with an existing <template> element', async function () {
        const assetGraph = new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlTemplate/'});
        await assetGraph.loadAssets('index.html')
            .populate();

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
    });
});
