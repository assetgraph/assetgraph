/*global describe, it*/
var expect = require('./unexpected-with-plugins').clone();
var parseExpression = require('../lib/parseExpression');

describe('parseExpression', function () {
    expect.addAssertion('to parse as', function (expect, subject, value) {
        expect(parseExpression(subject), 'to equal', value);
    });

    it('should parse a number', function () {
        expect(2, 'to parse as', {
            type: 'Literal',
            value: 2,
            raw: '2'
        });
    });

    it('should parse a string', function () {
        expect('"foo"', 'to parse as', {
            type: 'Literal',
            value: 'foo',
            raw: '"foo"'
        });
    });

    it('should parse an identifier string', function () {
        expect('foo', 'to parse as', {
            type: 'Identifier',
            name: 'foo'
        });
    });

    it('should parse a binary operation', function () {
        expect('4 + 8', 'to parse as', {
            type: 'BinaryExpression',
            operator: '+',
            left: { type: 'Literal', value: 4, raw: '4' },
            right: { type: 'Literal', value: 8, raw: '8' }
        });
    });
});
