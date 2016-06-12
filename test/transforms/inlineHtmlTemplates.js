/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('transforms/inlineHtmlTemplates', function () {
    it('should handle a test case with a single Knockout.js template with a nested template loaded using the systemjs-tpl plugin', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/inlineHtmlTemplates/withNested/'})
            .loadAssets('index.html')
            .populate()
            .bundleSystemJs()
            .populate()
            .inlineHtmlTemplates()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'HtmlInlineScriptTemplate', 2);
                expect(assetGraph, 'to contain relations', {type: 'HtmlInlineScriptTemplate', from: {url: /\/index\.html$/}}, 2);
                expect(
                    assetGraph.findAssets({url: /\/index\.html$/})[0].text,
                    'to contain',
                    '<script type="text/html" id="theEmbeddedTemplate" foo="bar">\n    <h1>This is an embedded template, which should also end up in the main document</h1>\n</script>' +
                    '<script type="text/html" id="foo"><div></div>\n\n</script>'
                );
            });
    });

    it('should handle a test case with several Knockout.js templates loaded using the systemjs-tpl plugin', function () {
        return new AssetGraph({root: __dirname + '/../../testdata/transforms/inlineHtmlTemplates/multiple/'})
            .loadAssets('index.html')
            .populate()
            .bundleSystemJs()
            .populate()
            .inlineHtmlTemplates()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'HtmlInlineScriptTemplate', 6);
                expect(assetGraph, 'to contain relations', {type: 'HtmlInlineScriptTemplate', from: {url: /\/index\.html$/}}, 6);
                expect(
                    assetGraph.findAssets({url: /\/index\.html$/})[0].text,
                    'to contain',
                    '<script type="text/html" id="theEmbeddedTemplate" foo="bar">\n    <h1>This is the embedded template, which should also end up in the main document</h1>\n</script>' +
                    '<script type="text/html" foo="bar1">\n    <h1>This embedded template has no id. This too should end up in the main document, along with it\'s attributes</h1>\n</script>' +
                    '<script type="text/html" foo="bar2">\n    <h1>This embedded template has no id. This too should end up in the main document, along with it\'s attributes</h1>\n</script>' +
                    '<script type="text/html" id="foo"><img data-bind="attr: {src: GETSTATICURL(\'/foo.png\')}">\n</script><script type="text/html" id="bar"><div>\n    <h1>bar.ko</h1>\n</div>\n</script><script type="text/html" id="templateWithEmbeddedTemplate"><div data-bind="template: \'theEmbeddedTemplate\'"></div>\n\n\n\n</script></body>\n</html>\n'
                );

                var relation = assetGraph.findRelations({type: 'HtmlInlineScriptTemplate', node: function (node) { return node.getAttribute('id') === 'foo'; }})[0];
                expect(relation, 'to be ok');
                expect(relation.to.text, 'to equal', '<img data-bind="attr: {src: GETSTATICURL(\'/foo.png\')}">\n');

                relation = assetGraph.findRelations({type: 'HtmlInlineScriptTemplate', node: function (node) { return node.getAttribute('id') === 'bar'; }})[0];
                expect(relation, 'to be ok');
                expect(relation.to.text, 'to equal', '<div>\n    <h1>bar.ko</h1>\n</div>\n');
            });
    });
});
