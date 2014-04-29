var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib');

vows.describe('HtmlInlineScriptTemplate test').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlInlineScriptTemplate/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 2 assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 2);
        },
        'the graph should contain 2 Html asset': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'Html', 2);
        },
        'the graph should contain 1 HtmlInlineScriptTemplate relation': function (assetGraph) {
            expect(assetGraph, 'to contain relation', 'HtmlInlineScriptTemplate');
        },
        'the HtmlInlineScriptTemplate relation should contain the right text': function (assetGraph) {
            expect(assetGraph.findRelations({type: 'HtmlInlineScriptTemplate'})[0].to.text, 'to equal', '<div></div>');
        },
        'then manipulating the inline Html': {
            topic: function (assetGraph) {
                var inlineHtml = assetGraph.findAssets({type: 'Html', isInline: true})[0],
                    document = inlineHtml.parseTree;
                document.firstChild.appendChild(document.createTextNode('hello!'));
                inlineHtml.markDirty();
                return assetGraph;
            },
            'the text of the outer Html asset should contain the template': function (assetGraph) {
                expect(assetGraph.findAssets({type: 'Html', isInline: false})[0].text, 'to match', /<div>hello!<\/div>/);
            }
        }
    },
    'After loading test case with some advanced markup in an inline template': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlInlineScriptTemplate/'})
                .loadAssets('advancedMarkup.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 2 Html asset': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 'Html', 2);
        },
        'the graph should contain 1 HtmlInlineScriptTemplate relation': function (assetGraph) {
            expect(assetGraph, 'to contain relation', 'HtmlInlineScriptTemplate');
        },
        'the HtmlInlineScriptTemplate relation should contain the right text': function (assetGraph) {
            expect(assetGraph.findRelations({type: 'HtmlInlineScriptTemplate'})[0].to.text, 'to equal', "\n<div>foo<!--ko 'if':true-->bar<!--/ko-->quux</div>\n");
        },
        'then manipulating the inline Html': {
            topic: function (assetGraph) {
                var inlineHtml = assetGraph.findAssets({type: 'Html', isInline: true})[0],
                    document = inlineHtml.parseTree;
                document.appendChild(document.createTextNode('hello!'));
                inlineHtml.markDirty();
                return assetGraph;
            },
            'the text of the outer Html asset should contain the template': function (assetGraph) {
                expect(assetGraph.findAssets({type: 'Html', isInline: false})[0].text, 'to match', /hello!/);
            }
        }
    }
})['export'](module);
