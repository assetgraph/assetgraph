var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/JavaScriptSourceUrl', function () {
    it('should handle a test case with an existing bundle that has @sourceURL directives', function (done) {
        new AssetGraph({root: __dirname + '/JavaScriptSourceUrl/existingBundle/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 4);
                expect(assetGraph, 'to contain relations', 'JavaScriptSourceUrl', 2);

                assetGraph.findAssets({url: /\/bundle\.js$/})[0].markDirty();

                var javaScript = assetGraph.findAssets({url: /\/bundle\.js$/})[0];
                expect(javaScript.text, 'to match', /@\s*sourceURL=bar\.js/);
                expect(javaScript.text, 'to match', /@\s*sourceURL=foo\.js/);

                assetGraph.findAssets({url: /\/bundle\.js$/})[0].url = assetGraph.root + 'foo/bundle.js';

                var javaScript = assetGraph.findAssets({url: /\/bundle\.js$/})[0];
                expect(javaScript.text, 'to match', /@\s*sourceURL=..\/bar\.js/);
                expect(javaScript.text, 'to match', /@\s*sourceURL=..\/foo\.js/);
            })
            .run(done);
    });

    it('should handle a test case with two JavaScript assets, then running the addJavaScriptSourceUrl transform', function (done) {
        new AssetGraph({root: __dirname + '/JavaScriptSourceUrl/bundleRelations/'})
            .loadAssets('index.html')
            .populate()
            .addJavaScriptSourceUrl()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'JavaScriptSourceUrl', 2);

                expect(assetGraph.findAssets({url: /\/foo\.js$/})[0].text, 'to match', /@\s*sourceURL=\/foo\.js/);
                expect(assetGraph.findAssets({url: /\/bar\.js$/})[0].text, 'to match', /@\s*sourceURL=\/bar\.js/);
            })
            .bundleRelations({type: 'HtmlScript'})
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'JavaScript', 3);
                expect(
                    assetGraph.findAssets({type: 'JavaScript'}).pop().text,
                    'to match',
                    /\/\/\s*@\ssourceURL=\/foo\.js[\s\S]*\/\/\s*@\s*sourceURL=\/bar\.js/
                );
            })
            .run(done);
    });
});
