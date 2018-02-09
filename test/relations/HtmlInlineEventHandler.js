const pathModule = require('path');
/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');

describe('relations/HtmlInlineEventHandler', function () {
    it('should handle a test case with existing inline event handlers', async function () {
        const assetGraph = new AssetGraph({root: pathModule.resolve(__dirname, '../../testdata/relations/HtmlInlineEventHandler/')});
        await assetGraph.loadAssets('index.html');
        await assetGraph.populate();

        expect(assetGraph, 'to contain assets', 4);
        expect(assetGraph, 'to contain asset', 'Html');
        expect(assetGraph, 'to contain assets', 'JavaScript', 3);
        expect(assetGraph, 'to contain relations', 'HtmlInlineEventHandler', 3);
        assetGraph.findAssets({type: 'JavaScript'}).forEach(function (javaScript) {
            javaScript.text = javaScript.text.replace(/this/g, 'that');
        });
        expect(assetGraph.findAssets({type: 'Html'})[0].text, 'to match', /that\.focused.*that\.focused/);
    });
});
