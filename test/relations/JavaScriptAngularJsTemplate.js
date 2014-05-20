/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    AssetGraph = require('../../lib');

describe('relations/JavaScriptAngularJsTemplate', function () {
    it('should handle a test case exercising different syntaxes for using templates', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/relations/JavaScriptAngularJsTemplate/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 'Html', 8);
                expect(assetGraph, 'to contain assets', 'JavaScript', 2);
                expect(assetGraph, 'to contain relations', 'JavaScriptAngularJsTemplate', 4);
                expect(assetGraph, 'to contain asset', {type: 'Html', isInline: true, text: /<img src="foo.png">/});
                expect(assetGraph, 'to contain relations', 'JavaScriptAngularJsTemplateCacheAssignment', 2);
                expect(assetGraph, 'to contain asset', {type: 'Html', isInline: true, text: "<h1>4: Template with a relation (<img src='bar.png'>) injected directly into <code>$templateCache</code></h1>"});
                expect(assetGraph, 'to contain asset', {type: 'Html', isInline: true, text: "<h1>5: Template with a relation (<img src='quux.png'>) injected directly into <code>$templateCache</code>, but using a different variable name</h1>"});
                expect(assetGraph, 'to contain asset', {type: 'Png', url: /\/foo\.png$/});
                expect(assetGraph, 'to contain asset', {type: 'Png', url: /\/bar\.png$/});
                expect(assetGraph, 'to contain asset', {type: 'Png', url: /\/quux\.png$/});
            })
            .inlineAngularJsTemplates()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain no relations', 'JavaScriptAngularJsTemplateCacheAssignment');
                expect(assetGraph, 'to contain relations', 'HtmlInlineScriptTemplate', 4);

                var relation = assetGraph.findRelations({type: 'HtmlInlineScriptTemplate', node: function (node) {return node.getAttribute('id') === 'partials/1.html';}})[0];
                expect(relation, 'to be ok');
                expect(relation.to.text, 'to equal', '<h1>1: External template loaded asynchronously with <code>templateUrl: \'partials/1.html\'</code></h1>\n');

                expect(assetGraph, 'to contain no relations', {type: 'HtmlInlineScriptTemplate', to: {text: /3: Template/}});

                relation = assetGraph.findRelations({type: 'HtmlInlineScriptTemplate', node: function (node) {return node.getAttribute('id') === 'partials/2.html';}})[0];
                expect(relation, 'to be ok');
                expect(relation.to.text, 'to equal', '\n    <h1>2: Template in a &lt;script type="text/ng-template"&gt;-tag</h1>\n  ');

                relation = assetGraph.findRelations({type: 'HtmlInlineScriptTemplate', node: function (node) {return node.getAttribute('id') === 'partials/4.html';}})[0];
                expect(relation, 'to be ok');
                expect(relation.to.text, 'to equal', '<h1>4: Template with a relation (<img src=\'bar.png\'>) injected directly into <code>$templateCache</code></h1>');

                relation = assetGraph.findRelations({type: 'HtmlInlineScriptTemplate', node: function (node) {return node.getAttribute('id') === 'partials/5.html';}})[0];
                expect(relation, 'to be ok');
                expect(relation.to.text, 'to equal', '<h1>5: Template with a relation (<img src=\'quux.png\'>) injected directly into <code>$templateCache</code>, but using a different variable name</h1>');
            })
            .run(done);
    });
});
