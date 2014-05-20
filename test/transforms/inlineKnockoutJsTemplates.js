var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('transforms/inlineKnockoutJsTemplates', function () {
    it('should handle a test case with Knockout.js templates loaded using the tpl plugin', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/transforms/inlineKnockoutJsTemplates/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Html', 5);
                expect(assetGraph, 'to contain assets', {type: 'JavaScript', isInline: false}, 3);
                expect(assetGraph, 'to contain relations', {type: ['JavaScriptAmdRequire', 'JavaScriptAmdDefine'], to: {type: 'Html'}}, 4);
                expect(assetGraph, 'to contain relation', 'JavaScriptGetStaticUrl');
                expect(assetGraph, 'to contain assets', 'Html', 5);
                expect(assetGraph, 'to contain asset', 'Png');
            })
            .inlineKnockoutJsTemplates()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain no relations', {type: ['JavaScriptAmdRequire', 'JavaScriptAmdDefine'], to: {type: 'KnockoutJsTemplate'}});
                expect(assetGraph, 'to contain relations', 'HtmlInlineScriptTemplate', 4);
                expect(assetGraph, 'to contain relations', {type: 'HtmlInlineScriptTemplate', from: {url: /\/index\.html$/}}, 4);
                expect(assetGraph.findAssets({url: /\/index\.html$/})[0].text, 'to equal', '<!DOCTYPE html>\n<html>\n<head></head>\n<body>\n    <script src="require.js" data-main="main"></script>\n<script type="text/html" id="foo"><img data-bind="attr: {src: GETSTATICURL(\'foo.png\')}">\n</script><script type="text/html" id="bar"><div>\n    <h1>bar.ko</h1>\n</div>\n</script><script type="text/html" id="templateWithEmbeddedTemplate"><div data-bind="template: \'theEmbeddedTemplate\'"></div>\n\n</script><script type="text/html" id="theEmbeddedTemplate">\n    <h1>This is the embedded template, which should also end up in the main document</h1>\n</script></body>\n</html>\n');

                var relation = assetGraph.findRelations({type: 'HtmlInlineScriptTemplate', node: function (node) {return node.getAttribute('id') === 'foo';}})[0];
                expect(relation, 'to be ok');
                expect(relation.to.text, 'to equal', '<img data-bind="attr: {src: GETSTATICURL(\'foo.png\')}">\n');

                relation = assetGraph.findRelations({type: 'HtmlInlineScriptTemplate', node: function (node) {return node.getAttribute('id') === 'bar';}})[0];
                expect(relation, 'to be ok');
                expect(relation.to.text, 'to equal', '<div>\n    <h1>bar.ko</h1>\n</div>\n');
            })
            .run(done);
    });
});
