/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/HtmlInlineScriptTemplate', function () {
    it('should handle a test case with an existing <script type="text/html"> element', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlInlineScriptTemplate/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 2);
                expect(assetGraph, 'to contain assets', 'Html', 2);
                expect(assetGraph, 'to contain relation', 'HtmlInlineScriptTemplate');
                expect(assetGraph.findRelations({type: 'HtmlInlineScriptTemplate'})[0].to.text, 'to equal', '<div></div>');
                var inlineHtml = assetGraph.findAssets({type: 'Html', isInline: true})[0],
                    document = inlineHtml.parseTree;
                document.firstChild.appendChild(document.createTextNode('hello!'));
                inlineHtml.markDirty();

                expect(assetGraph.findAssets({type: 'Html', isInline: false})[0].text, 'to match', /<div>hello!<\/div>/);
            })
            .run(done);
    });

    it('should handle a test case with some advanced markup in a <script type="text/html"> element', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/HtmlInlineScriptTemplate/'})
            .loadAssets('advancedMarkup.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Html', 2);
                expect(assetGraph, 'to contain relation', 'HtmlInlineScriptTemplate');
                expect(assetGraph.findRelations({type: 'HtmlInlineScriptTemplate'})[0].to.text, 'to equal', '\n<div>foo<!--ko \'if\':true-->bar<!--/ko-->quux</div>\n');

                var inlineHtml = assetGraph.findAssets({type: 'Html', isInline: true})[0],
                    document = inlineHtml.parseTree;
                document.appendChild(document.createTextNode('hello!'));
                inlineHtml.markDirty();

                expect(assetGraph.findAssets({type: 'Html', isInline: false})[0].text, 'to match', /hello!/);
            })
            .run(done);
    });
});
