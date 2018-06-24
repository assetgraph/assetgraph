const unescapeCssString = require('./unescapeCssString');
const counterRendererByListStyleType = require('./counterRendererByListStyleType');
const getCounterCharacters = require('./getCounterCharacters');
const expandPermutations = require('../expandPermutations');
const combinePredicates = require('./combinePredicates');

function extractQuotes(quotes, token) {
  if (!quotes || quotes === 'none') {
    return '';
  }
  let text = '';
  let num = 0;
  // Tokenize the quotes attribute into quoted strings, eg.: '>>' '<<'
  quotes.replace(
    /"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/g,
    ($0, doubleQuotedString, singleQuotedString) => {
      if (
        (token === 'open-quote' && num % 2 === 0) ||
        (token === 'close-quote' && num % 2 === 1)
      ) {
        if (typeof doubleQuotedString === 'string') {
          text += unescapeCssString(doubleQuotedString);
        } else {
          // typeof singleQuotedString === 'string'
          text += unescapeCssString(singleQuotedString);
        }
      }
      num += 1;
    }
  );
  return text;
}

function tokenizeContent(content) {
  const tokens = [];
  // <content-list> = [ <string> | contents | <image> | <quote> | <target> | <leader()> ]+
  (content || 'normal').replace(
    /(url\(\s*(?:'(?:[^']|\\')*'|"(?:[^"]|\\")*"|(?:[^'"\\]|\\.)*?\s*)\))|counter\(\s*([a-z0-9-]+)\s*,\s*([a-zA-Z0-9-]+)\s*\)|counters\(\s*([a-z0-9-]+)\s*,\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)')\s*(?:,\s*([a-zA-Z0-9-]+)\s*)?\)|"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|([^'"]+)/g,
    (
      $0,
      url,
      counterName,
      counterStyle,
      countersCounterName,
      doubleQuotedCountersSeparator,
      singleQuotedCountersSeparator,
      countersCounterStyle,
      doubleQuotedString,
      singleQuotedString,
      other
    ) => {
      if (typeof doubleQuotedString === 'string') {
        tokens.push({
          type: 'string',
          value: unescapeCssString(doubleQuotedString)
        });
      } else if (typeof singleQuotedString === 'string') {
        tokens.push({
          type: 'string',
          value: unescapeCssString(singleQuotedString)
        });
      } else if (url) {
        tokens.push({ type: 'url', value: url });
      } else if (counterStyle) {
        tokens.push({
          type: 'counter',
          name: counterName,
          value: counterStyle
        });
      } else if (typeof doubleQuotedCountersSeparator === 'string') {
        tokens.push({
          type: 'counters',
          separator: unescapeCssString(doubleQuotedCountersSeparator),
          value: countersCounterStyle || 'decimal',
          name: countersCounterName
        });
      } else if (typeof singleQuotedCountersSeparator === 'string') {
        tokens.push({
          type: 'counters',
          separator: unescapeCssString(singleQuotedCountersSeparator),
          value: countersCounterStyle || 'decimal',
          name: countersCounterName
        });
      } else {
        other = other.trim();
        if (other === 'open-quote' || other === 'close-quote') {
          tokens.push({ type: other });
        } else if (other === 'normal' || other === 'none') {
          tokens.push({ type: other });
        } else {
          const matchAttr = other.trim().match(/^attr\(([\w-]+)\)$/);
          if (matchAttr) {
            tokens.push({ type: 'attr', value: matchAttr[1] });
          } else {
            // throw new Error('Cannot parse token: ' + other);
            tokens.push({ type: 'string', value: other });
          }
        }
      }
    }
  );
  return tokens;
}

function expandContent(
  tokens,
  node,
  quotes,
  hypotheticalCounterStyleByName,
  possibleCounterValuesByName
) {
  let text = '';
  for (const token of tokens) {
    if (token.type === 'string') {
      text += token.value;
    } else if (token.type === 'counter' || token.type === 'counters') {
      if (counterRendererByListStyleType[token.value]) {
        text += (possibleCounterValuesByName[token.name] || [0])
          .map(counterValue =>
            counterRendererByListStyleType[token.value](counterValue)
          )
          .join('');
      } else if (hypotheticalCounterStyleByName[token.value]) {
        const counterStyles = [];
        for (const counterStyleName of Object.keys(
          hypotheticalCounterStyleByName
        )) {
          counterStyles.push({
            name: counterStyleName,
            predicates:
              hypotheticalCounterStyleByName[counterStyleName].predicates,
            props: hypotheticalCounterStyleByName[counterStyleName].value
          });
        }
        text += getCounterCharacters(
          { props: hypotheticalCounterStyleByName[token.value].value },
          counterStyles,
          possibleCounterValuesByName[token.name] || [0]
        );
      } else {
        // Warn: Undefined counter style?
      }
      if (token.type === 'counters') {
        text += token.separator;
      }
    } else if (token.type === 'open-quote' || token.type === 'close-quote') {
      text += extractQuotes(quotes, token.type);
    } else if (token.type === 'attr') {
      text += node.getAttribute(token.value) || '';
    }
  }
  return text;
}

function extractTextFromContentPropertyValue(
  value,
  node,
  hypotheticalQuotesValues,
  hypotheticalCounterStyleValuesByName,
  possibleCounterValuesByName
) {
  const tokens = tokenizeContent(value);
  const isSeenByCounterStyle = {};
  function markCounterStyleAsSeen(counterStyleName) {
    if (!counterRendererByListStyleType[counterStyleName]) {
      isSeenByCounterStyle[counterStyleName] = true;
      const hypotheticalValues =
        hypotheticalCounterStyleValuesByName[counterStyleName];
      if (hypotheticalValues) {
        for (const hypotheticalValue of hypotheticalValues) {
          if (hypotheticalValue.value.fallback) {
            markCounterStyleAsSeen(hypotheticalValue.value.fallback);
          }
        }
      }
    }
  }

  for (const token of tokens) {
    if (token.type === 'counter' || token.type === 'counters') {
      markCounterStyleAsSeen(token.value);
    }
  }
  const usesQuotes = tokens.some(
    token => token.type === 'open-quote' || token.type === 'close-quote'
  );
  function expandCounterStyles(quotes) {
    const referencedCounterStyleNames = Object.keys(isSeenByCounterStyle);
    if (referencedCounterStyleNames.length > 0) {
      const result = [];
      for (const hypotheticalCounterStyleByName of expandPermutations(
        hypotheticalCounterStyleValuesByName,
        referencedCounterStyleNames
      )) {
        const value = expandContent(
          tokens,
          node,
          quotes,
          hypotheticalCounterStyleByName,
          possibleCounterValuesByName
        );
        if (value) {
          const predicates = combinePredicates(
            Object.keys(hypotheticalCounterStyleByName).map(
              counterStyleName =>
                hypotheticalCounterStyleByName[counterStyleName].predicates
            )
          );
          if (predicates) {
            result.push({ value, predicates });
          }
        }
      }
      return result;
    } else {
      return [
        {
          value: expandContent(
            tokens,
            node,
            quotes,
            hypotheticalCounterStyleValuesByName,
            possibleCounterValuesByName
          ),
          predicates: {}
        }
      ];
    }
  }

  if (usesQuotes) {
    const result = [];
    for (const hypotheticalQuotesValue of hypotheticalQuotesValues) {
      const expandedContentValues = expandCounterStyles(
        hypotheticalQuotesValue.value
      );
      for (const value of expandedContentValues) {
        value.predicates = combinePredicates([
          value.predicates,
          hypotheticalQuotesValue.predicates
        ]);
        if (value.predicates) {
          result.push(value);
        }
      }
    }
    return result;
  } else {
    return expandCounterStyles();
  }
}

module.exports = extractTextFromContentPropertyValue;
