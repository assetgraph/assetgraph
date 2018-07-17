const postcssValuesParser = require('postcss-values-parser');
const unquote = require('./unquote');

function injectSubsetDefinitions(cssValue, webfontNameMap) {
  const subsetFontNames = new Set(
    Object.values(webfontNameMap).map(name => name.toLowerCase())
  );
  const tokens = postcssValuesParser(cssValue).tokens;
  let resultStr = '';
  let isPreceededByWords = false;
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    let possibleFontFamily;
    if (token[0] === 'string') {
      possibleFontFamily = unquote(token[1]);
    } else if (token[0] === 'word') {
      if (!isPreceededByWords) {
        const wordSequence = [];
        for (let j = i; j < tokens.length; j += 1) {
          if (tokens[j][0] === 'word') {
            wordSequence.push(tokens[j][1]);
          } else if (tokens[j][0] !== 'space') {
            break;
          }
        }
        possibleFontFamily = wordSequence.join(' ');
      }
      isPreceededByWords = true;
    } else if (token[0] !== 'space') {
      isPreceededByWords = false;
    }
    if (possibleFontFamily) {
      // Bail out, a subset font is already listed
      const possibleFontFamilyLowerCase = possibleFontFamily.toLowerCase();
      if (subsetFontNames.has(possibleFontFamilyLowerCase)) {
        return cssValue;
      } else if (webfontNameMap[possibleFontFamilyLowerCase]) {
        resultStr += `'${webfontNameMap[possibleFontFamilyLowerCase].replace(
          /'/g,
          "\\'"
        )}', `;
      }
    }
    resultStr += token[1];
  }
  return resultStr;
}

module.exports = injectSubsetDefinitions;
