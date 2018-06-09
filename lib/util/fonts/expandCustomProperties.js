const postCssValuesParser = require('postcss-values-parser');
const expandPermutations = require('../expandPermutations');
const combinePredicates = require('./combinePredicates');
const initialValueByProp = require('./initialValueByProp');

function expandCustomProperties(hypotheticalValues, prop, traceProp) {
  let hasCopied = false;
  const hypotheticalValuesByCustomProp = {};
  for (let i = 0; i < hypotheticalValues.length; i += 1) {
    const hypotheticalValue = hypotheticalValues[i];
    // Quick test for whether the value contains custom properties:
    if (/var\(--[^)]+\)/.test(hypotheticalValue.value)) {
      const tokens = postCssValuesParser(hypotheticalValue.value).tokens;
      const seenCustomProperties = new Set();
      for (let j = 0; j < tokens.length - 3; j += 1) {
        if (
          tokens[j][1] === 'var' &&
          tokens[j + 1][0] === '(' &&
          tokens[j + 2][1] === '--' &&
          tokens[j + 3][0] === 'word'
        ) {
          const customPropertyName = '--' + tokens[j + 3][1];
          hypotheticalValuesByCustomProp[
            customPropertyName
          ] = hypotheticalValuesByCustomProp[customPropertyName] ||
            traceProp(customPropertyName, 0, hypotheticalValue.predicates) || [
              {
                value: undefined,
                predicates: hypotheticalValue.predicates
              }
            ];
          seenCustomProperties.add(customPropertyName);
        }
      }
      if (seenCustomProperties.size === 0) {
        // The quick regexp test was a false positive
        continue;
      }
      const replacementHypotheticalValues = [];
      for (const permutation of expandPermutations(
        hypotheticalValuesByCustomProp
      )) {
        const predicates = combinePredicates([
          hypotheticalValue.predicates,
          ...Object.values(permutation).map(v => v.predicates)
        ]);
        let value = '';
        for (let j = 0; j < tokens.length; j += 1) {
          if (
            tokens[j][1] === 'var' &&
            tokens[j + 1][0] === '(' &&
            tokens[j + 2][1] === '--' &&
            tokens[j + 3][0] === 'word'
          ) {
            const customPropertyName = `--${tokens[j + 3][1]}`;
            if (
              permutation[customPropertyName] &&
              permutation[customPropertyName].value
            ) {
              value += permutation[customPropertyName].value;
              while (j < tokens.length && tokens[j][0] !== ')') {
                j += 1;
              }
            } else if (j < tokens.length && tokens[j + 4][0] === 'comma') {
              // Undefined property, but there is a default value
              j += 5;
              while (j < tokens.length && tokens[j][0] === 'space') {
                j += 1;
              }
              while (j < tokens.length && tokens[j][0] !== ')') {
                value += tokens[j][1];
                j += 1;
              }
            } else {
              // Reference to an undefined custom property and no default value
              value = initialValueByProp[prop];
              break;
            }
          } else {
            value += tokens[j][1];
          }
        }
        replacementHypotheticalValues.push({
          predicates,
          value
        });
      }
      if (!hasCopied) {
        hypotheticalValues = [...hypotheticalValues];
        hasCopied = true;
      }
      hypotheticalValues.splice(i, 1, ...replacementHypotheticalValues);
      i -= 1;
    }
  }
  return hypotheticalValues;
}

module.exports = expandCustomProperties;
