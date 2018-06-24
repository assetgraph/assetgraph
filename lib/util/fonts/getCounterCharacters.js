const unescapeCssString = require('./unescapeCssString');
const unquote = require('./unquote');
const counterRendererByListStyleType = require('./counterRendererByListStyleType');

function isWithinRange(value, range) {
  const subRanges = range.split(/\s*,\s*/);
  for (let i = 0; i < subRanges.length; i += 1) {
    const endpoints = subRanges[i].split(/\s+/);
    let lower = endpoints[0];
    let upper = endpoints[1];
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
      .map(counterValue =>
        getCounterCharacters(counterStyle, counterStyles, counterValue)
      )
      .join('');
  }

  let text = '';

  function renderFallback() {
    const fallback = counterStyle.props.fallback || 'decimal';
    if (counterRendererByListStyleType[fallback]) {
      return counterRendererByListStyleType[fallback](counterValue);
    } else {
      let text = '';
      for (const counterStyle of counterStyles) {
        if (counterStyle.name === fallback) {
          text += getCounterCharacters(
            counterStyle,
            counterStyles,
            counterValue
          );
        }
      }
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

  const textBySymbolNumber = [];
  if (typeof counterStyle.props.symbols === 'string') {
    counterStyle.props.symbols.replace(
      /"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|(url\(\s*(?:'(?:[^']|\\')*'|"(?:[^"]|\\")*"|(?:[^'"\\]|\\.)*?\s*)\)|([^'" ]+))/g,
      ($0, doubleQuotedString, singleQuotedString, url, other) => {
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
  const system = counterStyle.props.system || 'symbolic';
  let remainder;
  if (system === 'cyclic') {
    if (counterValue >= 1) {
      text +=
        textBySymbolNumber[(counterValue - 1) % textBySymbolNumber.length];
    } else {
      text += renderFallback();
    }
  } else if (system === 'symbolic') {
    if (counterValue >= 1) {
      const numRepetitions =
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
      let rendered = '';
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
    const tokens = [];
    (counterStyle.props['additive-symbols'] || '').replace(
      /(\d+)\s+(?:(url\(\s*(?:'(?:[^']|\\')*'|"(?:[^"]|\\")*"|(?:[^'"\\]|\\.)*?\s*)\))|"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|([^'",]+))/g,
      ($0, value, url, doubleQuotedString, singleQuotedString, other) => {
        let text = '';
        if (typeof doubleQuotedString === 'string') {
          text = doubleQuotedString;
        } else if (typeof singleQuotedString === 'string') {
          text = singleQuotedString;
        } else if (typeof other === 'string') {
          text = other;
        }
        tokens.push({
          value: parseInt(value, 10),
          text
        });
      }
    );
    // Sort by descending value so we can greedily find the symbols to use:
    tokens.sort((a, b) => b.value - a.value);
    remainder = counterValue;
    for (const token of tokens) {
      while (remainder >= token.value) {
        text += token.text;
        remainder -= token.value;
      }
    }
  } else if (/^fixed/i.test(system)) {
    let firstSymbolValue = 1;
    const matchFixedWithNumber = system.match(/^\s*fixed\s+(-?\d+)\s*$/);
    if (matchFixedWithNumber) {
      firstSymbolValue = parseInt(matchFixedWithNumber[1]);
    }
    const symbolIndex = counterValue - firstSymbolValue;
    if (symbolIndex >= 0 && symbolIndex < textBySymbolNumber.length) {
      text += textBySymbolNumber[symbolIndex];
    } else {
      text += renderFallback();
    }
  }
  if (typeof counterStyle.props.suffix === 'string') {
    text += unescapeCssString(unquote(counterStyle.props.suffix));
  }
  const padValue = counterStyle.props.pad;
  if (typeof padValue === 'string') {
    padValue.replace(
      /\d+ (?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|(url\(\s*(?:'(?:[^']|\\')*'|"(?:[^"]|\\")*"|(?:[^'"\\]|\\.)*?\s*)\)))/g,
      ($0, doubleQuotedString, singleQuotedString) => {
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
