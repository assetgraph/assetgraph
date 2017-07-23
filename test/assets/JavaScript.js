/*global describe, it*/
const expect = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');
const sinon = require('sinon');

describe('assets/JavaScript', function () {
    it('should handle a test case that has a parse error in an inline JavaScript asset', async function () {
        let firstWarning;
        await new AssetGraph({root: __dirname + '/../../testdata/assets/JavaScript/'})
            .on('warn', err => firstWarning = firstWarning || err)
            .loadAssets('parseErrorInInlineJavaScript.html');

        expect(firstWarning, 'to be an', Error);
        expect(firstWarning.message, 'to match', /parseErrorInInlineJavaScript\.html/);
        expect(firstWarning.message, 'to match', /line 2\b/);
    });

    it('should handle a test case that has a parse error in an external JavaScript asset', async function () {
        let firstWarning;
        await new AssetGraph({root: __dirname + '/../../testdata/assets/JavaScript/'})
            .on('warn', err => firstWarning = firstWarning || err)
            .loadAssets('parseErrorInExternalJavaScript.html')
            .populate();

        expect(firstWarning, 'to be an', Error);
        expect(firstWarning.message, 'to match', /parseError\.js/);
        expect(firstWarning.message, 'to match', /line 6\b/);
    });

    it('should handle a test case that has a parse error in an asset not in an assetgraph', function () {
        expect(() => new AssetGraph.JavaScript({ text: 'var test)' }).parseTree, 'to throw');
    });

    it('should handle setting a new parseTree', function () {
        const one = new AssetGraph.JavaScript({ text: 'var test = "true";' });
        const two = new AssetGraph.JavaScript({ text: 'var test = "false";' });

        expect(one, 'not to have the same AST as', two);

        two.parseTree = one.parseTree;

        expect(one, 'to have the same AST as', two);
    });

    it('should handle minification', function () {
        const one = new AssetGraph.JavaScript({ text: 'function test (argumentName) { return argumentName; }' });
        const two = new AssetGraph.JavaScript({ text: 'function test (argumentName) { return argumentName; }' });

        expect(one, 'to have the same AST as', two);

        two.minify();

        expect(one.text, 'not to equal', two.text);
        expect(two.text, 'to equal', 'function test(argumentName){return argumentName}');
    });

    it('should handle invalid arguments for Amd define call', async function () {
        sinon.stub(console, 'info');

        const invalidArgument = new AssetGraph.JavaScript({
            isRequired: true,
            text: 'define([1], function () {})'
        });

        invalidArgument.findOutgoingRelationsInParseTree();

        await new AssetGraph({ root: '.' })
            .loadAssets([
                invalidArgument
            ])
            .populate();
    });

    it('should preserve the copyright notice in a JavaScript asset', async function () {
        const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/assets/JavaScript/'})
            .loadAssets('copyrightNotice.js');

        const javaScript = assetGraph.findAssets({type: 'JavaScript'})[0];
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
    });

    it('should handle a test case with JavaScript assets that have regular comments as the first non-whitespace tokens', async function () {
        const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/assets/JavaScript/'})
            .loadAssets('initialComment*.js');

        for (const javaScript of assetGraph.findAssets({type: 'JavaScript'})) {
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
        }

        const javaScripts = assetGraph.findAssets({type: 'JavaScript'});
        expect(javaScripts[0].text, 'not to match', /Initial comment/);
        expect(javaScripts[1].text, 'not to match', /Initial comment/);
    });

    it('should handle a test case with a JavaScript asset that has comments right before EOF, then marking it as dirty', async function () {
        const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/assets/JavaScript/'})
            .loadAssets('commentsBeforeEof.js')
            .populate();

        const javaScript = assetGraph.findAssets({type: 'JavaScript'})[0];
        // The reserialized JavaScript asset should still contain @preserve comment before eof, but not the quux one

        javaScript.markDirty();

        expect(javaScript.text, 'to match', /@preserve/);
        expect(javaScript.text, 'to match', /quux/);

        javaScript.minify();

        // The reserialized JavaScript asset should contain both the @preserve and the quux comment when pretty printed
        expect(javaScript.text, 'to match', /@preserve/);
        expect(javaScript.text, 'not to match', /quux/);
    });

    it('should handle a test case with conditional compilation (@cc_on)', async function () {
        const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/assets/JavaScript/'})
            .loadAssets('conditionalCompilation.js');

        for (const javaScript of assetGraph.findAssets({type: 'JavaScript'})) {
            javaScript.markDirty();
        }

        expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to match', /@cc_on/);

        await assetGraph.compressJavaScript();

        // The @cc_on comment should still be in the serialization of the asset
        expect(assetGraph.findAssets({type: 'JavaScript'})[0].text, 'to match', /@cc_on/);
    });

    it('should handle a test case with global strict mode', async function () {
        const assetGraph = await new AssetGraph({root: __dirname + '/../../testdata/assets/JavaScript/'})
            .loadAssets('globalstrict.html')
            .populate();

        expect(assetGraph.findAssets({fileName: 'globalstrict.js'})[0].strict, 'to equal', true);
        expect(assetGraph.findAssets({fileName: 'nonstrict.js'})[0].strict, 'to equal', false);
    });

    it('should tolerate ES6 syntax', function () {
        const es6Text = 'import gql from \'graphql-tag\';\nlet a = 123;';
        const javaScript = new AssetGraph.JavaScript({
            text: es6Text
        });
        expect(javaScript.parseTree, 'to satisfy', {
            type: 'Program',
            body: [
                { type: 'ImportDeclaration' },
                { type: 'VariableDeclaration', kind: 'let' }
            ],
            sourceType: 'module'
        });
        javaScript.markDirty();
        expect(javaScript.text, 'to equal', es6Text);
    });

    it.skip('should tolerate Object spread syntax', function () {
        const text = 'const foo = { ...bar };';
        const javaScript = new AssetGraph.JavaScript({ text });
        expect(javaScript.parseTree, 'to satisfy', {
            type: 'Program',
            body: [
            ],
            sourceType: 'module'
        });
        javaScript.markDirty();
        expect(javaScript.text, 'to equal', text);
    });

    it('should tolerate JSX syntax', function () {
        const jsxText = 'function render() { return (<MyComponent />); }';
        const javaScript = new AssetGraph.JavaScript({
            text: jsxText
        });
        expect(javaScript.parseTree, 'to satisfy', {
            type: 'Program',
            body: [
                {
                    type: 'FunctionDeclaration',
                    body: {
                        type: 'BlockStatement',
                        body: [
                            {
                                type: 'ReturnStatement',
                                argument: {
                                    type: 'JSXElement',
                                    openingElement: {
                                        type: 'JSXOpeningElement',
                                        name: {
                                            type: 'JSXIdentifier',
                                            name: 'MyComponent'
                                        }
                                    },
                                    children: [],
                                    closingElement: null
                                }
                            }
                        ]
                    }
                }
            ],
            sourceType: 'module'
        });
        javaScript.markDirty();
        // This doesn't work because escodegen doesn't support JSX:
        // expect(javaScript.text, 'to equal', jsxText);
    });

    it('should fall back to "script" mode when a parse error is encountered', function () {
        const text = 'await = 123;';
        const javaScript = new AssetGraph.JavaScript({ text });
        expect(javaScript.parseTree, 'to satisfy', {
            type: 'Program',
            body: [
                {
                    type: 'ExpressionStatement',
                    expression: {
                        type: 'AssignmentExpression',
                        operator: '=',
                        left: { type: 'Identifier', name: 'await' },
                        right: { type: 'Literal', value: 123 }
                    }
                }
            ],
            sourceType: 'script'
        });
        javaScript.markDirty();
        expect(javaScript.text, 'to equal', text);
    });

    it('should emit an info event (and no warn events) when falling back to script mode', async function () {
        const errorSpy = sinon.spy().named('error');
        const warnSpy = sinon.spy().named('warn');
        const infoSpy = sinon.spy().named('info');
        await new AssetGraph()
            .on('error', errorSpy)
            .on('warn', warnSpy)
            .on('info', infoSpy)
            .loadAssets(new AssetGraph.JavaScript({
                url: 'http://example.com/script.js',
                text: 'await = 123;'
            }))
            .populate();

        expect([errorSpy, warnSpy, infoSpy], 'to have calls satisfying', () => {
            infoSpy('Could not parse http://example.com/script.js as a module, fall back to script mode\nLine 1: Unexpected identifier');
        });
    });

    it('should emit one warn event (and no other events) when neither module nor script mode works', async function () {
        const errorSpy = sinon.spy().named('error');
        const warnSpy = sinon.spy().named('warn');
        const infoSpy = sinon.spy().named('info');
        await new AssetGraph()
            .on('error', errorSpy)
            .on('warn', warnSpy)
            .on('info', infoSpy)
            .loadAssets(new AssetGraph.JavaScript({
                url: 'http://example.com/script.js',
                text: 'qwvce)'
            }))
            .populate();

        expect([errorSpy, warnSpy, infoSpy], 'to have calls satisfying', () => {
            warnSpy('Parse error in http://example.com/script.js\nLine 1: Unexpected token ) (line 1)');
        });
    });
});
