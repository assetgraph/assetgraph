var vows = require('vows'),
    assert = require('assert'),
    uglify = require('uglify-js'),
    uglifyAST = require('../lib/util/uglifyAST');

function testCase(ast, obj) {
    return {
        'from ast to obj': {
            topic: function () {
                return uglifyAST.astToObj(ast);
            },
            'should produce the expected JavaScript object': function (_obj) {
                assert.deepEqual(_obj, obj);
            }
        },
        'from ast to obj through uglify.uglify.gen_code and eval': {
            topic: function () {
                return eval('(' + uglify.uglify.gen_code(['toplevel', [['stat', ast]]]) + ')');
            },
            'should produce the expected JavaScript object': function (_obj) {
                assert.deepEqual(_obj, obj);
            }
        },
        'from obj to ast': {
            topic: function () {
                return uglifyAST.objToAST(obj);
            },
            'should produce the expected AST': function (_ast) {
                assert.deepEqual(_ast, ast);
            }
        },
        'from obj to ast through JSON.stringify and uglify.parser': {
            topic: function () {
                return uglify.parser.parse('(' + JSON.stringify(obj) + ')')[1][0][1]; // Strip 'toplevel' and 'stat' nodes
            },
            'should produce the expected AST': function (_ast) {
                assert.deepEqual(_ast, ast);
            }
        }
    };
}

vows.describe('Converting JavaScript objects to Uglify ASTs and vice versa').addBatch({
    'convert null': testCase(
        ['name', 'null'],
        null
    ),
    'convert false': testCase(
        ['name', 'false'],
        false
    ),
    'convert true': testCase(
        ['name', 'true'],
        true
    ),
    'convert string literal': testCase(
        ['string', 'Hello, \u263a'],
        'Hello, \u263a'
    ),
    'convert number literal': testCase(
        ['num', 999],
        999
    ),
    'convert array literal': testCase(
        ['array', [['string', 'foo'], ['name', 'true'], ['array', [['name', 'null']]]]],
        ['foo', true, [null]]
    ),
    'convert object literal': testCase(
        ['object', [['keyName1', ['string', 'stringValue']], ['keyName2', ['array', [['name', 'null'], ['num', 10]]]]]],
        {keyName1: 'stringValue', keyName2: [null, 10]}
    )
})['export'](module);
