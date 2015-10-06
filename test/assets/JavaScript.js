/*global describe, it*/
var expect = require('../unexpected-with-plugins'),
    _ = require('lodash'),
    AssetGraph = require('../../lib'),
    errors = require('../../lib/errors'),
    sinon = require('sinon');

describe('assets/JavaScript', function () {
    it('should handle a test case that has a parse error in an inline JavaScript asset', function (done) {
        var firstWarning;
        new AssetGraph({root: __dirname + '/../../testdata/assets/JavaScript/'})
            .on('warn', function (err) {
                firstWarning = firstWarning || err;
            })
            .loadAssets('parseErrorInInlineJavaScript.html')
            .queue(function (assetGraph) {
                expect(firstWarning, 'to be an', Error);
                expect(firstWarning.message, 'to match', /parseErrorInInlineJavaScript\.html/);
                expect(firstWarning.message, 'to match', /line 2\b/);
            })
            .run(done);
    });

    it('should handle a test case that has a parse error in an external JavaScript asset', function (done) {
        var firstWarning;
        new AssetGraph({root: __dirname + '/../../testdata/assets/JavaScript/'})
            .on('warn', function (err) {
                firstWarning = firstWarning || err;
            })
            .loadAssets('parseErrorInExternalJavaScript.html')
            .populate()
            .queue(function (assetGraph) {
                expect(firstWarning, 'to be an', Error);
                expect(firstWarning.message, 'to match', /parseError\.js/);
                expect(firstWarning.message, 'to match', /line 6\b/);
            })
            .run(done);
    });

    it('should handle a test case that has a parse error in an asset not in an assetgraph', function (done) {
        function parseError() {
            return  new AssetGraph.JavaScript({
                text: 'var test)'
            }).parseTree;
        }

        expect(parseError, 'to throw');

        done();
    });

    it('should handle setting a new parseTree', function (done) {
        var one = new AssetGraph.JavaScript({ text: 'var test = "true";' });
        var two = new AssetGraph.JavaScript({ text: 'var test = "false";' });

        expect(one, 'not to have the same AST as', two);

        two.parseTree = one.parseTree;

        expect(one, 'to have the same AST as', two);

        done();
    });

    it('should handle minification', function (done) {
        var one = new AssetGraph.JavaScript({ text: 'function test (argumentName) { return argumentName; }' });
        var two = new AssetGraph.JavaScript({ text: 'function test (argumentName) { return argumentName; }' });

        expect(one, 'to have the same AST as', two);

        two.minify();

        expect(one.text, 'not to equal', two.text);
        expect(two.text, 'to equal', 'function test(argumentName){return argumentName};');

        done();
    });

    it('should handle custom relations syntax errors outside a graph', function (done) {
        var includeError = new AssetGraph.JavaScript({ text: 'INCLUDE(1, 2);' });
        expect(includeError.findOutgoingRelationsInParseTree.bind(includeError), 'to throw', function (e) {
            expect(e.type, 'to be', errors.SyntaxError.type);
            expect(e.message, 'to match', /Invalid INCLUDE syntax: Must take a single string argument/);
        });

        var gettextManyArguments = new AssetGraph.JavaScript({ text: 'GETTEXT(1, 2, 3);' });
        expect(gettextManyArguments.findOutgoingRelationsInParseTree.bind(gettextManyArguments), 'to throw', function (e) {
            expect(e.type, 'to be', errors.SyntaxError.type);
            expect(e.message, 'to match', /Invalid GETTEXT syntax/);
        });

        var gettextWrongArgumentType = new AssetGraph.JavaScript({ text: 'GETTEXT(1);' });
        expect(gettextWrongArgumentType.findOutgoingRelationsInParseTree.bind(gettextWrongArgumentType), 'to throw', function (e) {
            expect(e.type, 'to be', errors.SyntaxError.type);
            expect(e.message, 'to match', /Invalid GETTEXT syntax/);
        });

        var trhtmlWrongArgumentType = new AssetGraph.JavaScript({ text: 'TRHTML(1, 2, 3);' });
        expect(trhtmlWrongArgumentType.findOutgoingRelationsInParseTree.bind(trhtmlWrongArgumentType), 'to throw', function (e) {
            expect(e.type, 'to be', errors.SyntaxError.type);
            expect(e.message, 'to be', 'Invalid TRHTML syntax: TRHTML(1, 2, 3)');
        });

        var warnings = [];
        new AssetGraph({ root: '.' })
            .on('warn', function (warning) {
                warnings.push(warning);
            })
            .loadAssets([
                includeError,
                gettextManyArguments,
                gettextWrongArgumentType,
                trhtmlWrongArgumentType
            ])
            .populate()
            .run(function (assetGraph) {
                expect(warnings, 'to have length', 4);
                done();
            });

    });

    it('should handle invalid arguments for Amd define call', function (done) {
        sinon.stub(console, 'info');

        var invalidArgument = new AssetGraph.JavaScript({
            isRequired: true,
            text: 'define([1], function () {})'
        });

        invalidArgument.findOutgoingRelationsInParseTree();

        new AssetGraph({ root: '.' })
            .loadAssets([
                invalidArgument
            ])
            .populate()
            .run(function (assetGraph) {
                done();
            });
    });

    it('should handle non-file-scheme RequireJS.require dependency errors', function (done) {
        sinon.stub(console, 'warn');

        var invalidScheme = new AssetGraph.JavaScript({
            text: 'require("http://assetgraph.org/foo.js")'
        });

        invalidScheme.findOutgoingRelationsInParseTree();

        expect(console.warn.callCount, 'to be', 1);
        expect(console.warn.getCall(0).args[0], 'to match', /Skipping JavaScriptCommonJsRequire \(only supported from file: urls\)/);

        console.warn.restore();

        var warnings = [];
        new AssetGraph({ root: '.' })
            .on('warn', function (warning) {
                warnings.push(warning);
            })
            .loadAssets([
                invalidScheme
            ])
            .populate()
            .run(function (assetGraph) {
                expect(warnings, 'to have length', 1);
                done();
            });
    });

    it('should assume self encapsulation when require function is exposed as argument from outer scope', function (done) {
        sinon.stub(console, 'warn');

        var selfEncapsulated = new AssetGraph.JavaScript({
            text: '(function (require, module) { require("dependency"); })'
        });

        selfEncapsulated.findOutgoingRelationsInParseTree();

        expect(console.warn, 'was not called');

        console.warn.restore();

        var warnings = [];
        new AssetGraph({ root: '.' })
            .on('warn', function (warning) {
                warnings.push(warning);
            })
            .loadAssets([
                selfEncapsulated
            ])
            .populate()
            .queue(function (assetGraph) {
                expect(warnings, 'to have length', 0);
                expect(assetGraph, 'to contain relations', 0);
            })
            .run(done);
    });

    it('should handle non-file-scheme RequireJS.require dependency errors', function (done) {
        sinon.stub(console, 'warn');

        var invalidScheme = new AssetGraph.JavaScript({
            url: 'file://requireFoo.js',
            text: 'require("./foo")'
        });

        invalidScheme.findOutgoingRelationsInParseTree();

        expect(console.warn.callCount, 'to be', 1);
        expect(console.warn.getCall(0).args[0], 'to be', 'Couldn\'t resolve require(\'./foo\'), skipping');

        console.warn.restore();

        var warnings = [];
        new AssetGraph({ root: '.' })
            .on('warn', function (warning) {
                warnings.push(warning);
            })
            .loadAssets([
                invalidScheme
            ])
            .populate()
            .run(function (assetGraph) {
                expect(warnings, 'to have length', 1);
                done();
            });
    });

    it('should handle a test case with relations located at multiple levels in the parse tree', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/assets/JavaScript/relationsDepthFirst/'})
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
        new AssetGraph({root: __dirname + '/../../testdata/assets/JavaScript/'})
            .loadAssets('copyrightNotice.js')
            .queue(function (assetGraph) {
                var javaScript = assetGraph.findAssets({type: 'JavaScript'})[0];
                javaScript.parseTree.body.push({
                    type: 'VariableDeclaration',
                    kind: 'var',
                    declarations: [
                        {
                            type: 'VariableDeclarator',
                            id: {
                                type: 'Identifier',
                                name: 'foo'
                            },
                            init: { type: 'Literal', value: 'quux' }
                        }
                    ]
                });
                javaScript.markDirty();

                expect(javaScript.text, 'to match', /Copyright blablabla/);
            })
            .run(done);
    });

    it('should handle a test case with JavaScript assets that have regular comments as the first non-whitespace tokens', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/assets/JavaScript/'})
            .loadAssets('initialComment*.js')
            .queue(function (assetGraph) {
                assetGraph.findAssets({type: 'JavaScript'}).forEach(function (javaScript) {
                    javaScript.parseTree.body.push({
                        type: 'VariableDeclaration',
                        declarations: [
                            {
                                type: 'VariableDeclarator',
                                id: {
                                    type: 'Identifier',
                                    name: 'foo'
                                },
                                kind: 'var',
                                init: { type: 'Literal', value: 'quux' }
                            }
                        ]
                    });
                    javaScript.minify();
                });

                var javaScripts = assetGraph.findAssets({type: 'JavaScript'});
                expect(javaScripts[0].text, 'not to match', /Initial comment/);
                expect(javaScripts[1].text, 'not to match', /Initial comment/);
            })
            .run(done);
    });

    it('should handle a test case with a JavaScript asset that has comments right before EOF, then marking it as dirty', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/assets/JavaScript/'})
            .loadAssets('commentsBeforeEof.js')
            .populate()
            .queue(function (assetGraph) {
                var javaScript = assetGraph.findAssets({type: 'JavaScript'})[0];
                // The reserialized JavaScript asset should still contain @preserve comment before eof, but not the quux one

                javaScript.markDirty();

                expect(javaScript.text, 'to match', /@preserve/);
                expect(javaScript.text, 'to match', /quux/);

                javaScript.minify();

                // The reserialized JavaScript asset should contain both the @preserve and the quux comment when pretty printed
                expect(javaScript.text, 'to match', /@preserve/);
                expect(javaScript.text, 'not to match', /quux/);
            })
            .run(done);
    });

    it('should handle a test case with conditional compilation (@cc_on)', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/assets/JavaScript/'})
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
        new AssetGraph({root: __dirname + '/../../testdata/assets/JavaScript/'})
            .loadAssets('globalstrict.html')
            .populate()
            .queue(function (assetGraph) {
                expect(assetGraph.findAssets({fileName: 'globalstrict.js'})[0].strict, 'to equal', true);
                expect(assetGraph.findAssets({fileName: 'nonstrict.js'})[0].strict, 'to equal', false);
            })
            .run(done);
    });

    it('should attempt to fold constants in require calls to string', function (done) {
        new AssetGraph({root: __dirname + '/../../testdata/assets/JavaScript/'})
            .loadAssets('foldableConstants.js')
            .populate()
            .queue(function (assetGraph) {
                var asset = assetGraph.findAssets({type: 'JavaScript'})[0];
                expect(asset.text, 'to match', /require\(\['foobar'/);
                expect(asset.text, 'to match', /require\(\['http:\/\/example.com\/foo.js'/);
            }).run(done);
    });
});
