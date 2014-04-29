var vows = require('vows'),
    expect = require('./unexpected-with-plugins'),
    _ = require('underscore'),
    AssetGraph = require('../lib'),
    uglifyJs = AssetGraph.JavaScript.uglifyJs,
    uglifyAst = AssetGraph.JavaScript.uglifyAst;

vows.describe('JavaScript').addBatch({
    'After loading test case that has a parse error in an inline JavaScript asset': {
        topic: function () {
            var err,
                callback = this.callback;
            new AssetGraph({root: __dirname + '/JavaScript/'})
                .on('warn', function (_err) {
                    err = _err;
                })
                .loadAssets('parseErrorInInlineJavaScript.html')
                .run(function () {
                    callback(err);
                });
        },
        'it should result in an Error object': function (err, assetGraph) {
            expect(err, 'to be an', Error);
        },
        'the error message should specify the url of the Html asset and the line number of the error': function (err, assetGraph) {
            expect(err.message, 'to match', /parseErrorInInlineJavaScript\.html/);
            expect(err.message, 'to match', /line 2\b/);
            expect(err.message, 'to match', /column 9\b/);
        }
    },
    'After loading test case that has a parse error in an external JavaScript asset': {
        topic: function () {
            var firstWarning,
                callback = this.callback;
            var assetGraph = new AssetGraph({root: __dirname + '/JavaScript/'})
                .on('warn', function (err) {
                    firstWarning = firstWarning || err;
                })
                .loadAssets('parseErrorInExternalJavaScript.html')
                .populate()
                .run(function () {
                    callback(firstWarning);
                });
        },
        'it should result in an Error object': function (err, assetGraph) {
            expect(err, 'to be an', Error);
        },
        'the error message should specify the url of the external JavaScript asset and the line number of the error': function (err, assetGraph) {
            expect(err.message, 'to match', /parseError\.js/);
            expect(err.message, 'to match', /line 6\b/);
            expect(err.message, 'to match', /column 14\b/);
        }
    },
    'after loading test case with relations located at multiple levels in the parse tree': {
        topic: function () {
            new AssetGraph({root: __dirname + '/JavaScript/relationsDepthFirst/'})
                .loadAssets('index.html')
                .populate()
                .run(this.callback);
        },
        'the relations should be in depth-first order in the graph': function (assetGraph) {
            expect(_.pluck(assetGraph.findRelations({from: {type: 'JavaScript'}}), 'href'), 'to equal',
                             [
                                 './foo',
                                 './data.json',
                                 './bar'
                             ]);
        }
    },
    'After loading test case that has a copyright notice in a JavaScript asset': {
        topic: function () {
            new AssetGraph({root: __dirname + '/JavaScript/'})
                .loadAssets('copyrightNotice.js')
                .run(this.callback);
        },
        'then manipulating the parseTree of the JavaScript asset and marking it dirty': {
            topic: function (assetGraph) {
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
                return assetGraph;
            },
            'the copyright notice should be preserved in the serialized asset': function (assetGraph) {
                var javaScript = assetGraph.findAssets({type: 'JavaScript'})[0];
                expect(javaScript.text, 'to match', /Copyright blablabla/);
            }
        }
    },
    'After loading test case with JavaScript assets that have regular comments as the first non-whitespace tokens': {
        topic: function () {
            new AssetGraph({root: __dirname + '/JavaScript/'})
                .loadAssets('initialComment*.js')
                .run(this.callback);
        },
        'then manipulating the parseTree of the JavaScript asset and marking it dirty': {
            topic: function (assetGraph) {
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
                return assetGraph;
            },
            'the comments should be gone from the serialized asset': function (assetGraph) {
                var javaScripts = assetGraph.findAssets({type: 'JavaScript'});
                expect(/Initial comment/.test(javaScripts[0].text), 'to be false');
                expect(/Initial comment/.test(javaScripts[1].text), 'to be false');
            }
        }
    },
    'After loading test case with a JavaScript asset that has comments right before EOF, then marking it as dirty': {
        topic: function () {
            new AssetGraph({root: __dirname + '/JavaScript/'})
                .loadAssets('commentsBeforeEof.js')
                .populate()
                .queue(function (assetGraph) {
                    assetGraph.findAssets({type: 'JavaScript'})[0].markDirty();
                })
                .run(this.callback);
        },
        'the reserialized JavaScript asset should still contain @preserve comment before eof, but not the quux one': function (assetGraph) {
            var javaScript = assetGraph.findAssets({type: 'JavaScript'})[0];
            expect(javaScript.text, 'to match', /@preserve/);
            expect(/quux/.test(javaScript.text), 'to be false');
        },
        'the reserialized JavaScript asset should contain both the @preserve and the quux comment when pretty printed': function (assetGraph) {
            var javaScript = assetGraph.findAssets({type: 'JavaScript'})[0];
            javaScript.prettyPrint();
            expect(javaScript.text, 'to match', /@preserve/);
            expect(javaScript.text, 'to match', /quux/);
        }
    },
    'After loading a test case with conditional compilation (@cc_on)': {
        topic: function () {
            new AssetGraph({root: __dirname + '/JavaScript/'})
                .loadAssets('conditionalCompilation.js')
                .run(this.callback);
        },
        'then mark the JavaScript asset dirty': {
            topic: function (assetGraph) {
                assetGraph.findAssets({type: 'JavaScript'}).forEach(function (javaScript) {
                    javaScript.markDirty();
                });
                return assetGraph;
            },
            'the @cc_on comment should still be in the serialization of the asset': function (assetGraph) {
                expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to match', /@cc_on/);
            },
            'then run the compressJavaScript transform': {
                topic: function (assetGraph) {
                    assetGraph.compressJavaScript().run(this.callback);
                },
                'the @cc_on comment should still be in the serialization of the asset': function (assetGraph) {
                    expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to match', /@cc_on/);
                }
            }
        }
    },
    'After loading a test case with global strict mode': {
        topic: function () {
            new AssetGraph({root: __dirname + '/JavaScript/'})
                .on('warn', function (warning) {
                    if (!this._warnings) {
                        this._warnings = [];
                    }
                    this._warnings.push(warning);
                })
                .loadAssets('globalstrict.html')
                .populate()
                .run(this.callback);
        },
        'the globalstrict.js JavaScript asset should have a "strict" property': function (assetGraph) {
            expect(assetGraph.findAssets({fileName: 'globalstrict.js'})[0].strict, 'to equal', true);
        },
        'the nonstrict.js JavaScript asset should not have a "strict" property': function (assetGraph) {
            expect(assetGraph.findAssets({fileName: 'nonstrict.js'})[0].strict, 'to equal', false);
        }
    }
})['export'](module);
