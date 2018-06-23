const expect = require('../../unexpected-with-plugins');
const injectSubsetDefinitions = require('../../../lib/util/fonts/injectSubsetDefinitions');

describe('injectSubsetDefinitions', function() {
  const webfontNameMap = {
    'times new roman': 'times new roman__subset'
  };

  it('should inject before a doublequoted font family name', function() {
    expect(
      injectSubsetDefinitions('"times new roman"', webfontNameMap),
      'to equal',
      '\'times new roman__subset\', "times new roman"'
    );
  });

  it('should inject before a singlequoted font family name', function() {
    expect(
      injectSubsetDefinitions("'times new roman'", webfontNameMap),
      'to equal',
      "'times new roman__subset', 'times new roman'"
    );
  });

  it('should inject before a "bareword" font family name', function() {
    expect(
      injectSubsetDefinitions('times new roman', webfontNameMap),
      'to equal',
      "'times new roman__subset', times new roman"
    );
  });

  it('should tolerate multiple spaces between words', function() {
    expect(
      injectSubsetDefinitions('times   new   roman', webfontNameMap),
      'to equal',
      "'times new roman__subset', times   new   roman"
    );
  });

  it('should ignore occurrences that are immediately preceeded by other barewords', function() {
    expect(
      injectSubsetDefinitions('sorry times new roman, other', webfontNameMap),
      'to equal',
      'sorry times new roman, other'
    );
  });

  it('should ignore occurrences that are succeeded by other barewords', function() {
    expect(
      injectSubsetDefinitions('times new roman yeah', webfontNameMap),
      'to equal',
      'times new roman yeah'
    );
  });

  it('should not inject the subset into a value that already has it', function() {
    expect(
      injectSubsetDefinitions(
        "'times new roman__subset', times new roman",
        webfontNameMap
      ),
      'to equal',
      "'times new roman__subset', times new roman"
    );
  });

  it('should escape singlequotes in the subset font name', function() {
    expect(
      injectSubsetDefinitions('"times new roman"', {
        'times new roman': "times'new'roman__subset"
      }),
      'to equal',
      "'times\\'new\\'roman__subset', \"times new roman\""
    );
  });
});
