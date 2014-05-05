var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/HtmlInlineEventHandler', function () {
    it('should handle a test case with existing inline event handlers', function (done) {
        new AssetGraph({root: __dirname + '/HtmlInlineEventHandler/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 4);
                expect(assetGraph, 'to contain asset', 'Html');
                expect(assetGraph, 'to contain assets', 'JavaScript', 3);
                expect(assetGraph, 'to contain relations', 'HtmlInlineEventHandler', 3);
                assetGraph.findAssets({type: 'JavaScript'}).forEach(function (javaScript) {
                    javaScript.text = javaScript.text.replace(/this/g, 'that');
                });
                expect(assetGraph.findAssets({type: 'Html'})[0].text, 'to match', /that\.focused.*that\.focused/);
            })
            .run(done);
    });
});
