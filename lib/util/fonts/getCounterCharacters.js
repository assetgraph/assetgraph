var unescapeCssString = require('./unescapeCssString');
var unquote = require('./unquote');
var counterRendererByListStyleType = require('./counterRendererByListStyleType');

function isWithinRange(value, range) {
  var subRanges = range.split(/\s*,\s*/);
  for (var i = 0; i < subRanges.length; i += 1) {
    var endpoints = subRanges[i].split(/\s+/);
    var lower = endpoints[0];
    var upper = endpoints[1];
    if (lower.toLowerCase() === 'infinite') {
      lower = -Infinity;
    }
    if (upper.toLowerCase() === 'infinite') {
      upper = Infinity;
    }
    if (value >= lower && value <= upper) {
      return true;
    }
  }
  return false;
}

function getCounterCharacters(counterStyle, counterStyles, counterValue) {
  if (Array.isArray(counterValue)) {
    return counterValue
      .map(function(counterValue) {
        return getCounterCharacters(counterStyle, counterStyles, counterValue);
      })
      .join('');
  }

  var text = '';

  function renderFallback() {
    var fallback = counterStyle.props.fallback || 'decimal';
    if (counterRendererByListStyleType[fallback]) {
      return counterRendererByListStyleType[fallback](counterValue);
    } else {
      var text = '';
      counterStyles.forEach(function(counterStyle) {
        if (counterStyle.name === fallback) {
          text += getCounterCharacters(
            counterStyle,
            counterStyles,
            counterValue
          );
        }
      });
      return text;
    }
  }

  if (
    counterStyle.props.range &&
    counterStyle.props.range !== 'auto' &&
    !isWithinRange(counterValue, counterStyle.props.range)
  ) {
    return renderFallback();
  }

  if (typeof counterStyle.props.prefix === 'string') {
    text += unescapeCssString(unquote(counterStyle.props.prefix));
  }

  if (counterValue < 0 && typeof counterStyle.props.negative === 'string') {
    text += unescapeCssString(unquote(counterStyle.props.negative));
  }

  var textBySymbolNumber = [];
  if (typeof counterStyle.props.symbols === 'string') {
    counterStyle.props.symbols.replace(
      /"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|(url\(\s*(?:'(?:[^']|\\')*'|"(?:[^"]|\\")*"|(?:[^'"\\]|\\.)*?\s*)\)|([^'" ]+))/g,
      function($0, doubleQuotedString, singleQuotedString, url, other) {
        if (typeof doubleQuotedString === 'string') {
          textBySymbolNumber.push(unescapeCssString(doubleQuotedString));
        } else if (typeof singleQuotedString === 'string') {
          textBySymbolNumber.push(unescapeCssString(singleQuotedString));
        } else if (typeof other === 'string') {
          textBySymbolNumber.push(other.trim());
        }
      }
    );
  }
  var system = counterStyle.props.system || 'symbolic';
  var remainder;
  if (system === 'cyclic') {
    if (counterValue >= 1) {
      text +=
        textBySymbolNumber[(counterValue - 1) % textBySymbolNumber.length];
    } else {
      text += renderFallback();
    }
  } else if (system === 'symbolic') {
    if (counterValue >= 1) {
      var numRepetitions =
        1 + Math.floor((counterValue - 1) / textBySymbolNumber.length);
      text += textBySymbolNumber[
        (counterValue - 1) % textBySymbolNumber.length
      ].repeat(numRepetitions);
    } else {
      text += renderFallback();
    }
  } else if (system === 'alphabetic' || system === 'numeric') {
    remainder = counterValue;
    if (system === 'numeric') {
      remainder += 1;
    }
    if (remainder >= 1) {
      var rendered = '';
      while (remainder > 0) {
        rendered =
          textBySymbolNumber[(remainder - 1) % textBySymbolNumber.length] +
          rendered;
        remainder = Math.floor((remainder - 1) / textBySymbolNumber.length);
      }
      text += rendered;
    } else {
      text += renderFallback();
    }
  } else if (system === 'additive') {
    var tokens = [];
    (counterStyle.props['additive-symbols'] || '').replace(
      /(\d+)\s+(?:(url\(\s*(?:'(?:[^']|\\')*'|"(?:[^"]|\\")*"|(?:[^'"\\]|\\.)*?\s*)\))|"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|([^'",]+))/g,
      function($0, value, url, doubleQuotedString, singleQuotedString, other) {
        var text = '';
        if (typeof doubleQuotedString === 'string') {
          text = doubleQuotedString;
        } else if (typeof singleQuotedString === 'string') {
          text = singleQuotedString;
        } else if (typeof other === 'string') {
          text = other;
        }
        tokens.push({
          value: parseInt(value, 10),
          text: text
        });
      }
    );
    // Sort by descending value so we can greedily find the symbols to use:
    tokens.sort(function(a, b) {
      return b.value - a.value;
    });
    remainder = counterValue;
    tokens.forEach(function(token) {
      while (remainder >= token.value) {
        text += token.text;
        remainder -= token.value;
      }
    });
  } else if (/^fixed/i.test(system)) {
    var firstSymbolValue = 1;
    var matchFixedWithNumber = system.match(/^\s*fixed\s+(-?\d+)\s*$/);
    if (matchFixedWithNumber) {
      firstSymbolValue = parseInt(matchFixedWithNumber[1]);
    }
    var symbolIndex = counterValue - firstSymbolValue;
    if (symbolIndex >= 0 && symbolIndex < textBySymbolNumber.length) {
      text += textBySymbolNumber[symbolIndex];
    } else {
      text += renderFallback();
    }
  }
  if (typeof counterStyle.props.suffix === 'string') {
    text += unescapeCssString(unquote(counterStyle.props.suffix));
  }
  var padValue = counterStyle.props.pad;
  if (typeof padValue === 'string') {
    padValue.replace(
      /\d+ (?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|(url\(\s*(?:'(?:[^']|\\')*'|"(?:[^"]|\\")*"|(?:[^'"\\]|\\.)*?\s*)\)))/g,
      function($0, doubleQuotedString, singleQuotedString) {
        if (typeof doubleQuotedString === 'string') {
          text += unescapeCssString(doubleQuotedString);
        } else if (typeof singleQuotedString === 'string') {
          text += unescapeCssString(singleQuotedString);
        }
      }
    );
  }
  return text;
}

module.exports = getCounterCharacters;
