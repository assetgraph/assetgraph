var vows = require('vows'),
    assert = require('assert'),
    AssetGraph = require('../lib'),
    uglifyJs = AssetGraph.JavaScript.uglifyJs,
    uglifyAst = AssetGraph.JavaScript.uglifyAst;

vows.describe('HtmlDataBindAttribute test').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/HtmlDataBindAttribute/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 4 assets': function (assetGraph) {
            assert.equal(assetGraph.findAssets().length, 4);
        },
        'the graph should contain 1 Html asset': function (assetGraph) {
            assert.equal(assetGraph.findAssets({type: 'Html'}).length, 1);
        },
        'the graph should contain 3 HtmlDataBindAttribute relations': function (assetGraph) {
            assert.equal(assetGraph.findRelations({type: 'HtmlDataBindAttribute'}).length, 3);
        },
        'the parseTree getters of all inline JavaScript assets should return an AST': function (assetGraph) {
            assetGraph.findAssets({type: 'JavaScript'}).forEach(function (javaScript) {
                assert.isObject(javaScript.parseTree);
            });
        },
        'then manipulating the first inline JavaScript': {
            topic: function (assetGraph) {
                var javaScript = assetGraph.findAssets({type: 'JavaScript', isInline: true})[0];
                javaScript.parseTree.body[0].body.properties.push(new uglifyJs.AST_ObjectKeyVal({
                    key: 'yup',
                    value: new uglifyJs.AST_String({value: 'right'})
                }));
                javaScript.markDirty();
                return assetGraph;
            },
            'the text of the Html asset should contain the updated data-bind attribute': function (assetGraph) {
                assert.matches(assetGraph.findAssets({type: 'Html'})[0].text, /yup/);
            }
        }
    }
})['export'](module);
