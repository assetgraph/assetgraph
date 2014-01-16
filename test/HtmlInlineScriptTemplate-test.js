var vows = require('vows'),
    assert = require('assert'),
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
            assert.equal(assetGraph.findAssets().length, 2);
        },
        'the graph should contain 2 Html asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html'}).length, 2);
        },
        'the graph should contain 1 HtmlInlineScriptTemplate relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlInlineScriptTemplate'}).length, 1);
        },
        'the HtmlInlineScriptTemplate relation should contain the right text': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlInlineScriptTemplate'})[0].to.text, '<div></div>');
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
                assert.matches(assetGraph.findAssets({type: 'Html', isInline: false})[0].text, /<div>hello!<\/div>/);
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
            assert.equal(assetGraph.findAssets({type: 'Html'}).length, 2);
        },
        'the graph should contain 1 HtmlInlineScriptTemplate relation': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlInlineScriptTemplate'}).length, 1);
        },
        'the HtmlInlineScriptTemplate relation should contain the right text': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlInlineScriptTemplate'})[0].to.text, "\n<div>foo<!--ko 'if':true-->bar<!--/ko-->quux</div>\n");
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
                assert.matches(assetGraph.findAssets({type: 'Html', isInline: false})[0].text, /hello!/);
            }
        }
    }
})['export'](module);
