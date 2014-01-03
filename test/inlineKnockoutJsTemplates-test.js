var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib');

vows.describe('inlineKnockoutJsTemplates').addBatch({
    'After loading a test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/inlineKnockoutJsTemplates/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 5 Html assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html'}).length, 5);
        },
        'the graph should contain 3 non-inline JavaScript assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'JavaScript', isInline: false}).length, 3);
        },
        'the graph should contain 4 JavaScriptAmdRequire/JavaScriptAmdDefine relations pointing at Html assets': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: ['JavaScriptAmdRequire', 'JavaScriptAmdDefine'], to: {type: 'Html'}}).length, 4);
        },
        'the graph should contain 1 JavaScriptGetStaticUrl relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'JavaScriptGetStaticUrl'}).length, 1);
        },
        'the graph should contain 5 Html assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html'}).length, 5);
        },
        'the graph should contain 1 Png asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Png'}).length, 1);
        },
        'then run the inlineKnockoutJsTemplates transform': {
            topic: function (assetGraph) {
                assetGraph.inlineKnockoutJsTemplates().run(this.callback);
            },
            'the graph should contain no JavaScriptAmdRequire/JavaScriptAmdDefine relations pointing at Knockout.js templates': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: ['JavaScriptAmdRequire', 'JavaScriptAmdDefine'], to: {type: 'KnockoutJsTemplate'}}).length, 0);
            },
            'the graph should contain 4 HtmlInlineScriptTemplate relations, all of them from the main Html asset': function (assetGraph) {
                assert.equal(assetGraph.findRelations({type: 'HtmlInlineScriptTemplate'}).length, 4);
                assert.equal(assetGraph.findRelations({type: 'HtmlInlineScriptTemplate', from: {url: /\/index\.html$/}}).length, 4);
            },
            'index.html should have the expected contents': function (assetGraph) {
                assert.equal(assetGraph.findAssets({url: /\/index\.html$/})[0].text, '<!DOCTYPE html>\n<html>\n<head></head>\n<body>\n    <script src="require.js" data-main="main"></script>\n<script type="text/html" id="foo"><img data-bind="attr: {src: GETSTATICURL(\'foo.png\')}">\n</script><script type="text/html" id="bar"><div>\n    <h1>bar.ko</h1>\n</div>\n</script><script type="text/html" id="templateWithEmbeddedTemplate"><div data-bind="template: \'theEmbeddedTemplate\'"></div>\n\n</script><script type="text/html" id="theEmbeddedTemplate">\n    <h1>This is the embedded template, which should also end up in the main document</h1>\n</script></body>\n</html>\n');
            },
            'one of the HtmlInlineScriptTemplateRelations should have an id of "foo" and point at a KnockoutJsTemplate asset with the correct contents': function (assetGraph) {
                var relation = assetGraph.findRelations({type: 'HtmlInlineScriptTemplate', node: function (node) {return node.getAttribute('id') === 'foo';}})[0];
                assert.ok(relation);
                assert.equal(relation.to.text, '<img data-bind="attr: {src: GETSTATICURL(\'foo.png\')}">\n');
            },
            'one of the HtmlInlineScriptTemplateRelations should have an id of "bar" and point at a KnockoutJsTemplate asset with the correct contents': function (assetGraph) {
                var relation = assetGraph.findRelations({type: 'HtmlInlineScriptTemplate', node: function (node) {return node.getAttribute('id') === 'bar';}})[0];
                assert.ok(relation);
                assert.equal(relation.to.text, '<div>\n    <h1>bar.ko</h1>\n</div>\n');
            }
        }
    }
})['export'](module);
