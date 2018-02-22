var extractTextFromContentPropertyValue = require('../../../lib/util/fonts/extractTextFromContentPropertyValue');
var sinon = require('sinon');
var expect = require('../../unexpected-with-plugins')
  .clone()
  .addAssertion('<array> to come out as <string|array>', function(
    expect,
    subject,
    value
  ) {
    expect.errorMode = 'nested';
    var result = extractTextFromContentPropertyValue(subject[0], subject[1]);
    if (typeof value === 'string') {
      expect(result, 'to satisfy', [{ value }]);
    } else {
      expect(result, 'to equal', value);
    }
  })
  .addAssertion('<string> to come out as <string|array>', function(
    expect,
    subject,
    value
  ) {
    expect([subject], 'to come out as', value);
  });

describe('extractTextFromContentPropertyValue', function() {
  it('should return empty string for none', function() {
    expect('none', 'to come out as', '');
  });

  it('should return empty string for normal', function() {
    expect('none', 'to come out as', '');
  });

  it('should decode a single quoted string', function() {
    expect("'foo'", 'to come out as', 'foo');
  });

  it('should decode a double quoted string', function() {
    expect('"foo"', 'to come out as', 'foo');
  });

  it('should support an escaped single quote in a single quoted string', function() {
    expect("'fo\\'o'", 'to come out as', "fo'o");
  });

  it('should support an escaped double quote in a double quoted string', function() {
    expect('"fo\\"o"', 'to come out as', 'fo"o');
  });

  it('should support escaped hex digits', function() {
    expect('"foo\\263a"', 'to come out as', 'foo☺');
  });

  it('should ignore a single whitespace after escaped hex digits', function() {
    expect('"f\\263a oo"', 'to come out as', 'f☺oo');
  });

  it('should ignore an image', function() {
    expect('url("foo.png")', 'to come out as', '');
  });

  it('should support attr(...) tokens', function() {
    var fakeNode = {
      getAttribute: sinon
        .stub()
        .named('getAttribute')
        .returns('bar')
    };
    expect(['attr(data-foo)', fakeNode], 'to come out as', 'bar');
    expect(fakeNode, 'to have calls satisfying', function() {
      fakeNode.getAttribute('data-foo');
    });
  });
});
