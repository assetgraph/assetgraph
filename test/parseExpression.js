const expect = require('./unexpected-with-plugins').clone();
const parseExpression = require('../lib/parseExpression');

describe('parseExpression', function() {
  expect.addAssertion('<any> to parse as <object>', function(
    expect,
    subject,
    value
  ) {
    expect(parseExpression(subject), 'to exhaustively satisfy', value);
  });

  it('should parse a number', function() {
    expect(2, 'to parse as', {
      type: 'Literal',
      start: 1,
      end: 2,
      value: 2,
      raw: '2'
    });
  });

  it('should parse a string', function() {
    expect('"foo"', 'to parse as', {
      type: 'Literal',
      start: 1,
      end: 6,
      value: 'foo',
      raw: '"foo"'
    });
  });

  it('should parse an identifier string', function() {
    expect('foo', 'to parse as', {
      type: 'Identifier',
      start: 1,
      end: 4,
      name: 'foo'
    });
  });

  it('should parse a binary operation', function() {
    expect('4 + 8', 'to parse as', {
      type: 'BinaryExpression',
      start: 1,
      end: 6,
      operator: '+',
      left: { type: 'Literal', start: 1, end: 2, value: 4, raw: '4' },
      right: { type: 'Literal', start: 5, end: 6, value: 8, raw: '8' }
    });
  });
});
