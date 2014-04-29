var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib'),
    uglifyJs = AssetGraph.JavaScript.uglifyJs,
    uglifyAst = AssetGraph.JavaScript.uglifyAst;

vows.describe('javascript: url test').addBatch({
    'After loading test case': {
        topic: function () {
            new AssetGraph({root: __dirname + '/javascriptUrl/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the graph should contain 2 assets': function (assetGraph) {
            expect(assetGraph, 'to contain assets', 2);
        },
        'the graph should contain 1 Html asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'Html');
        },
        'the graph should contain 1 HtmlAnchor relation': function (assetGraph) {
            expect(assetGraph, 'to contain relation', 'HtmlAnchor');
        },
        'the graph should contain 1 JavaScript asset': function (assetGraph) {
            expect(assetGraph, 'to contain asset', 'JavaScript');
        },
        'then manipulating the inline JavaScript': {
            topic: function (assetGraph) {
                var javaScript = assetGraph.findAssets({type: 'JavaScript', isInline: true})[0];
                javaScript.parseTree.body.push(new uglifyJs.AST_SimpleStatement({
                    body: new uglifyJs.AST_Call({
                        expression: new uglifyJs.AST_SymbolRef({name: 'alert'}),
                        args: [new uglifyJs.AST_String({value: 'bar'})]
                    })
                }));
                javaScript.markDirty();
                return assetGraph;
            },
            'the text of the Html asset should contain the updated javascript: url': function (assetGraph) {
                expect(assetGraph.findAssets({type: 'Html'})[0].text, 'to match', /bar/);
            }
        }
    }
})['export'](module);
