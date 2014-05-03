var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib');

vows.describe('relations.JavaScriptAngularJsTemplate').addBatch({
    'After loading a test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/JavaScriptAngularJsTemplate/'})
                .loadAssets('index.html')
                .populate()
                .run(done);
        },
        'the graph should contain 8 Html assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'Html', 8);
        },
        'the graph should contain 2 JavaScript assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'JavaScript', 2);
        },
        'the graph should contain 4 JavaScriptAngularJsTemplate relations': function (assetGraph) {
            expect(assetGraph, 'to contain relations', 'JavaScriptAngularJsTemplate', 4);
        },
        'the graph should have an inline Html asset with <img src="foo.png"> in its text': function (assetGraph) {
            expect(assetGraph, 'to contain asset', {type: 'Html', isInline: true, text: /<img src="foo.png">/});
        },
        'the graph should contain 2 JavaScriptAngularJsTemplateCacheAssignment relations': function (assetGraph) {
            expect(assetGraph, 'to contain relations', 'JavaScriptAngularJsTemplateCacheAssignment', 2);
        },
        'the graph should have an inline Html with <h1>4: Template injected directly into <code>$templateCache</code></h1> in its text': function (assetGraph) {
            expect(assetGraph, 'to contain asset', {type: 'Html', isInline: true, text: "<h1>4: Template with a relation (<img src='bar.png'>) injected directly into <code>$templateCache</code></h1>"});
        },
        'the graph should have an inline Html with <h1>5: Template with a relation (<img src=\'quux.png\'>) injected directly into <code>$templateCache</code>, but using a different variable name</h1> in its text': function (assetGraph) {
            expect(assetGraph, 'to contain asset', {type: 'Html', isInline: true, text: "<h1>5: Template with a relation (<img src='quux.png'>) injected directly into <code>$templateCache</code>, but using a different variable name</h1>"});
        },
        'the graph should have foo.png': function (assetGraph) {
            expect(assetGraph, 'to contain asset', {type: 'Png', url: /\/foo\.png$/});
        },
        'the graph should have bar.png': function (assetGraph) {
            expect(assetGraph, 'to contain asset', {type: 'Png', url: /\/bar\.png$/});
        },
        'the graph should have quux.png': function (assetGraph) {
            expect(assetGraph, 'to contain asset', {type: 'Png', url: /\/quux\.png$/});
        },
        'then run the inlineAngularJsTemplates transform': {
            topic: function (assetGraph) {
                assetGraph.inlineAngularJsTemplates().run(done);
            },
            'the graph should contain no JavaScriptAngularJsTemplateCacheAssignment relations': function (assetGraph) {
                expect(assetGraph, 'to contain no relations', 'JavaScriptAngularJsTemplateCacheAssignment');
            },
            'the graph should contain 4 HtmlInlineScriptTemplate relations': function (assetGraph) {
                expect(assetGraph, 'to contain relations', 'HtmlInlineScriptTemplate', 4);
            },
            'one of the HtmlInlineScriptTemplateRelations should have an id of "partials/1.html" and point at an Html asset with the correct contents': function (assetGraph) {
                var relation = assetGraph.findRelations({type: 'HtmlInlineScriptTemplate', node: function (node) {return node.getAttribute('id') === 'partials/1.html';}})[0];
                expect(relation, 'to be ok');
                expect(relation.to.text, 'to equal', '<h1>1: External template loaded asynchronously with <code>templateUrl: \'partials/1.html\'</code></h1>\n');
            },
            'none of the HtmlInlineScriptTemplateRelations should point at an asset with "3: Template" in its text': function (assetGraph) {
                expect(assetGraph, 'to contain no relations', {type: 'HtmlInlineScriptTemplate', to: {text: /3: Template/}});
            },
            'one of the HtmlInlineScriptTemplateRelations should have an id of "partials/2.html" and point at an Html asset with the correct contents': function (assetGraph) {
                var relation = assetGraph.findRelations({type: 'HtmlInlineScriptTemplate', node: function (node) {return node.getAttribute('id') === 'partials/2.html';}})[0];
                expect(relation, 'to be ok');
                expect(relation.to.text, 'to equal', '\n    <h1>2: Template in a &lt;script type="text/ng-template"&gt;-tag</h1>\n  ');
            },
            'one of the HtmlInlineScriptTemplateRelations should have an id of "partials/4.html" and point at an Html asset with the correct contents': function (assetGraph) {
                var relation = assetGraph.findRelations({type: 'HtmlInlineScriptTemplate', node: function (node) {return node.getAttribute('id') === 'partials/4.html';}})[0];
                expect(relation, 'to be ok');
                expect(relation.to.text, 'to equal', '<h1>4: Template with a relation (<img src=\'bar.png\'>) injected directly into <code>$templateCache</code></h1>');
            },
            'one of the HtmlInlineScriptTemplateRelations should have an id of "partials/5.html" and point at an Html asset with the correct contents': function (assetGraph) {
                var relation = assetGraph.findRelations({type: 'HtmlInlineScriptTemplate', node: function (node) {return node.getAttribute('id') === 'partials/5.html';}})[0];
                expect(relation, 'to be ok');
                expect(relation.to.text, 'to equal', '<h1>5: Template with a relation (<img src=\'quux.png\'>) injected directly into <code>$templateCache</code>, but using a different variable name</h1>');
            }
        }
    }
})['export'](module);
