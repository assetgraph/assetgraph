/*global describe, it, beforeEach*/
const unexpected = require('../unexpected-with-plugins');
const AssetGraph = require('../../lib/AssetGraph');
const sinon = require('sinon');

describe('transforms/replaceSymbolsInJavaScript', function () {
    let assetGraph;
    beforeEach(function () {
        assetGraph = new AssetGraph();
    });

    const expect = unexpected.clone().addAssertion('to come out as', async function (expect, subject, value) {
        this.args.pop(); // Don't inspect the callback when the assertion fails
        // subject.code, subject.defines
        expect(subject, 'to be an object');
        var assetConfig = {
            url: 'file://' + __dirname + '/bogus.js'
        };
        if (subject && typeof subject.type === 'string') {
            assetConfig.parseTree = subject.parseTree;
        } else if (typeof subject.text === 'string') {
            assetConfig.text = subject.text;
        } else if (Buffer.isBuffer(subject.rawSrc)) {
            assetConfig.rawSrc = subject.rawSrc;
        }
        await assetGraph
            .loadAssets(new AssetGraph.JavaScript(assetConfig))
            .replaceSymbolsInJavaScript({type: 'JavaScript'}, subject.defines || {});

        expect(assetGraph.findAssets({fileName: 'bogus.js'})[0], 'to have the same AST as', value);
        return assetGraph.findAssets()[0].parseTree;
    });

    it('should replace a primitive value', function () {
        return expect({
            text: 'var bar = FOO;',
            defines: {
                FOO: '"foo"'
            }
        }, 'to come out as', function () {
            /* eslint-disable */
            var bar = 'foo';
            /* eslint-enable */
        });
    });

    it('should not replace an undefined value', function () {
        return expect({
            text: 'var bar = FOO;',
            defines: {
            }
        }, 'to come out as', function () {
            /* eslint-disable */
            var bar = FOO;
            /* eslint-enable */
        });
    });

    it('should replace an undefined value in an object with undefined', async function () {
        const warnSpy = sinon.spy().named('warn');
        assetGraph.on('warn', warnSpy);
        await expect({
            text: 'var bar = FOO.BAR;',
            defines: {
                FOO: {}
            }
        }, 'to come out as', function () {
            /* eslint-disable */
            var bar = undefined;
            /* eslint-enable */
        });
        expect(warnSpy, 'to have calls satisfying', () => warnSpy(new Error('Could not find a value for "FOO.BAR". Replacing with undefined.')));
    });

    it('should replace an undefined value in a nested object with undefined', async function () {
        const warnSpy = sinon.spy().named('warn');
        assetGraph.on('warn', warnSpy);
        await expect({
            text: 'var bar = !BAZ.FOO.BAR;',
            defines: {
                BAZ: {}
            }
        }, 'to come out as', function () {
            /* eslint-disable */
            var bar = !undefined;
            /* eslint-enable */
        });
        expect(warnSpy, 'to have calls satisfying', () => warnSpy(new Error('Could not find a value for "BAZ.FOO.BAR". Replacing with undefined.')));
    });

    it('should not replace the LHS of an assignment', function () {
        return expect({
            text: 'var FOO = "bar";',
            defines: {
                FOO: { type: 'Literal', value: 'foo' }
            }
        }, 'to come out as', 'var FOO = "bar";');
    });

    it('should replace complex value', function () {
        return expect({
            text: 'var bar = FOO;',
            defines: {
                FOO: {quux: {baz: 123}}
            }
        }, 'to come out as', function () {
            /* eslint-disable */
            var bar = {quux: {baz: 123}};
            /* eslint-enable */
        });
    });

    it('should replace nested value with dot notation', function () {
        return expect({
            text: 'var bar = FOO.quux;',
            defines: {
                FOO: {quux: 'baz'}
            }
        }, 'to come out as', function () {
            /* eslint-disable */
            var bar = 'baz';
            /* eslint-enable */
        });
    });

    it('should replace nested value with bracket notation', function () {
        return expect({
            text: 'var bar = FOO["quux"];',
            defines: {
                FOO: {quux: 'baz'}
            }
        }, 'to come out as', function () {
            /* eslint-disable */
            var bar = 'baz';
            /* eslint-enable */
        });
    });

    it('should replace nested value with mixed notation', function () {
        return expect({
            text: 'var bar = FOO["quux"].baz;',
            defines: {
                FOO: { quux: { baz: 'foo' } }
            }
        }, 'to come out as', function () {
            /* eslint-disable */
            var bar = 'foo';
            /* eslint-enable */
        });
    });

    it('should work with numbers and bracket notation', function () {
        return expect({
            text: 'var bar = FOO[1];',
            defines: {
                FOO: { 1: 'baz' }
            }
        }, 'to come out as', function () {
            /* eslint-disable */
            var bar = 'baz';
            /* eslint-enable */
        });
    });

    it('should replace nested value with undefined if no value is found and emit a warning', function () {
        var warnings = [];
        assetGraph.on('warn', function (err) {
            warnings.push(err);
        });
        return expect({
            text: 'var qux = FOO.bar.baz.quux',
            defines: {
                FOO: { bar: { baz: {} } }
            }
        }, 'to come out as', function () {
            /* eslint-disable */
            var qux = undefined;
            /* eslint-enable */
        }).then(function () {
            expect(warnings, 'to satisfy', [ 'Could not find a value for "FOO.bar.baz.quux". Replacing with undefined.' ]);
        });
    });

    it('should proceed as far as possible if contents of brackets is not a constant', function () {
        return expect({
            text: 'var bar = FOO[function () { return "bar"; }];',
            defines: {
                FOO: { bar: 'baz' }
            }
        }, 'to come out as', function () {
            /* eslint-disable */
            var bar = { bar: 'baz' }[function () { return "bar"; }];
            /* eslint-enable */
        });
    });

    // Wishful thinking:
    it('should support dot notation in the LHS', function () {
        return expect({
            text: 'console.log(123);',
            defines: {
                'console.log': 'foo.bar'
            }
        }, 'to come out as', function () {
            /* eslint-disable */
            foo.bar(123);
            /* eslint-enable */
        });
    });

    it('should support bracket notation in the LHS', function () {
        return expect({
            text: 'alert(123 + hereIs["the thing"]);',
            defines: {
                'hereIs["the thing"]': 987
            }
        }, 'to come out as', function () {
            /* eslint-disable */
            alert(123 + 987);
            /* eslint-enable */
        });
    });

    it('should support a complex expression in the LHS', function () {
        return expect({
            text: '123 + foo(1 + 2);',
            defines: {
                'foo(1 + 2)': '456'
            }
        }, 'to come out as', function () {
            /* eslint-disable */
            123 + 456;
            /* eslint-enable */
        });
    });

    it('should not use the same AST node instance when replacing multiple occurrences', function () {
        return expect({
            text: 'FOO + FOO',
            defines: {
                FOO: 2
            }
        }, 'to come out as', function () {
            /* eslint-disable */
            2 + 2;
            /* eslint-enable */
        }).then(function (parseTree) {
            var binOp = parseTree.body[0].expression;
            expect(binOp.type, 'to equal', 'BinaryExpression');
            expect(binOp.left, 'not to be', binOp.right);
        });
    });

    it('should support literal object properties in the RHS', function () {
        return expect({
            text: 'alert(123 + theThing.foo + theThing["foo"]);',
            defines: {
                theThing: '{"foo": "bar"}'
            }
        }, 'to come out as', function () {
            /* eslint-disable */
            alert(123 + 'bar' + 'bar');
            /* eslint-enable */
        });
    });

    it('should only touch occurrences that are not part of a larger sequence of MemberExpressions', function () {
        return expect({
            text: 'window.FOO + window[FOO] + foo.bar.FOO + FOO',
            defines: {
                FOO: 2
            }
        }, 'to come out as', function () {
            /* eslint-disable */
            window.FOO + window[FOO] + foo.bar.FOO + 2;
            /* eslint-enable */
        });
    });
});
