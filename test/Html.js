var expect = require('./unexpected-with-plugins'),
    AssetGraph = require('../lib'),
    uglifyJs = AssetGraph.JavaScript.uglifyJs,
    uglifyAst = AssetGraph.JavaScript.uglifyAst;

describe('Html', function () {
    it('should handle a test case with a javascript: url', function (done) {
        new AssetGraph({root: __dirname + '/Html/javascriptUrl/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph, 'to contain assets', 2);
                expect(assetGraph, 'to contain asset', 'Html');
                expect(assetGraph, 'to contain relation', 'HtmlAnchor');
                expect(assetGraph, 'to contain asset', 'JavaScript');

                var javaScript = assetGraph.findAssets({type: 'JavaScript', isInline: true})[0];
                javaScript.parseTree.body.push(new uglifyJs.AST_SimpleStatement({
                    body: new uglifyJs.AST_Call({
                        expression: new uglifyJs.AST_SymbolRef({name: 'alert'}),
                        args: [new uglifyJs.AST_String({value: 'bar'})]
                    })
                }));
                javaScript.markDirty();

                expect(assetGraph.findAssets({type: 'Html'})[0].text, 'to match', /bar/);
            })
            .run(done);
    });
});
