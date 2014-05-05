var expect = require('../unexpected-with-plugins'),
    _ = require('underscore'),
    AssetGraph = require('../../lib'),
    uglifyJs = AssetGraph.JavaScript.uglifyJs,
    uglifyAst = AssetGraph.JavaScript.uglifyAst;

describe('assets/JavaScript', function () {
    it('should handle a test case that has a parse error in an inline JavaScript asset', function (done) {
        var firstWarning;
        new AssetGraph({root: __dirname + '/JavaScript/'})
            .on('warn', function (err) {
                firstWarning = firstWarning || err;
            })
            .loadAssets('parseErrorInInlineJavaScript.html')
            .queue(function (assetGraph) {
                expect(firstWarning, 'to be an', Error);
                expect(firstWarning.message, 'to match', /parseErrorInInlineJavaScript\.html/);
                expect(firstWarning.message, 'to match', /line 2\b/);
                expect(firstWarning.message, 'to match', /column 9\b/);
            })
            .run(done);
    });

    it('should handle a test case that has a parse error in an external JavaScript asset', function (done) {
        var firstWarning;
        new AssetGraph({root: __dirname + '/JavaScript/'})
            .on('warn', function (err) {
                firstWarning = firstWarning || err;
            })
            .loadAssets('parseErrorInExternalJavaScript.html')
            .populate()
            .queue(function (assetGraph) {
                expect(firstWarning, 'to be an', Error);
                expect(firstWarning.message, 'to match', /parseError\.js/);
                expect(firstWarning.message, 'to match', /line 6\b/);
                expect(firstWarning.message, 'to match', /column 14\b/);
            })
            .run(done);
    });

    it('should handle a test case with relations located at multiple levels in the parse tree', function (done) {
        new AssetGraph({root: __dirname + '/JavaScript/relationsDepthFirst/'})
            .loadAssets('index.html')
            .populate()
            .queue(function (assetGraph) {
                expect(_.pluck(assetGraph.findRelations({from: {type: 'JavaScript'}}), 'href'), 'to equal', [
                    './foo',
                    './data.json',
                    './bar'
                ]);
            })
            .run(done);
    });

    it('should preserve the copyright notice in a JavaScript asset', function (done) {
        new AssetGraph({root: __dirname + '/JavaScript/'})
            .loadAssets('copyrightNotice.js')
            .queue(function (assetGraph) {
                var javaScript = assetGraph.findAssets({type: 'JavaScript'})[0];
                javaScript.parseTree.body.push(new uglifyJs.AST_Var({
                    definitions: [
                        new uglifyJs.AST_VarDef({
                            name: new uglifyJs.AST_SymbolVar({name: 'foo'}),
                            value: new uglifyJs.AST_String({value: 'quux'})
                        })
                    ]
                }));
                javaScript.markDirty();

                expect(javaScript.text, 'to match', /Copyright blablabla/);
            })
            .run(done);
    });

    it('should handle a test case with JavaScript assets that have regular comments as the first non-whitespace tokens', function (done) {
        new AssetGraph({root: __dirname + '/JavaScript/'})
            .loadAssets('initialComment*.js')
            .queue(function (assetGraph) {
                assetGraph.findAssets({type: 'JavaScript'}).forEach(function (javaScript) {
                    javaScript.parseTree.body.push(new uglifyJs.AST_Var({
                        definitions: [
                            new uglifyJs.AST_VarDef({
                                name: new uglifyJs.AST_SymbolVar({name: 'foo'}),
                                value: new uglifyJs.AST_String({value: 'quux'})
                            })
                        ]
                    }));
                    javaScript.markDirty();
                });

                var javaScripts = assetGraph.findAssets({type: 'JavaScript'});
                expect(/Initial comment/.test(javaScripts[0].text), 'to be false');
                expect(/Initial comment/.test(javaScripts[1].text), 'to be false');
            })
            .run(done);
    });

    it('should handle a test case with a JavaScript asset that has comments right before EOF, then marking it as dirty', function (done) {
        new AssetGraph({root: __dirname + '/JavaScript/'})
            .loadAssets('commentsBeforeEof.js')
            .populate()
            .queue(function (assetGraph) {
                assetGraph.findAssets({type: 'JavaScript'})[0].markDirty();

                // The reserialized JavaScript asset should still contain @preserve comment before eof, but not the quux one

                var javaScript = assetGraph.findAssets({type: 'JavaScript'})[0];
                expect(javaScript.text, 'to match', /@preserve/);
                expect(/quux/.test(javaScript.text), 'to be false');

                // The reserialized JavaScript asset should contain both the @preserve and the quux comment when pretty printed
                javaScript.prettyPrint();
                expect(javaScript.text, 'to match', /@preserve/);
                expect(javaScript.text, 'to match', /quux/);
            })
            .run(done);
    });

    it('should handle a test case with conditional compilation (@cc_on)', function (done) {
        new AssetGraph({root: __dirname + '/JavaScript/'})
            .loadAssets('conditionalCompilation.js')
            .queue(function (assetGraph) {
                assetGraph.findAssets({type: 'JavaScript'}).forEach(function (javaScript) {
                    javaScript.markDirty();
                });

                expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to match', /@cc_on/);
            })
            .compressJavaScript()
            .queue(function (assetGraph) {
                // The @cc_on comment should still be in the serialization of the asset
                expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to match', /@cc_on/);
            })
            .run(done);
    });

    it('should handle a test case with global strict mode', function (done) {
        new AssetGraph({root: __dirname + '/JavaScript/'})
            .loadAssets('globalstrict.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({fileName: 'globalstrict.js'})[0].strict, 'to equal', true);
                expect(assetGraph.findAssets({fileName: 'nonstrict.js'})[0].strict, 'to equal', false);
            })
            .run(done);
    });
});
