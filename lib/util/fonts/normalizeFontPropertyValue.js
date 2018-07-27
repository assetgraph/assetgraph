const cssFontWeightNames = require('css-font-weight-names');
const initialValueByProp = require('./initialValueByProp');
const unquote = require('./unquote');

function normalizeFontPropertyValue(propName, value) {
  const propNameLowerCase = propName.toLowerCase();
  if (value === undefined) {
    return initialValueByProp[propName];
  }
  if (propNameLowerCase === 'font-family') {
    return unquote(value);
  } else if (propNameLowerCase === 'font-weight') {
    if (typeof value === 'string') {
      // FIXME: Stripping the +bolder... suffix here will not always yield the correct result
      // when expanding animations and transitions
      value = value.replace(/\+.*$/, '').toLowerCase();
    }
    return parseInt(cssFontWeightNames[value] || value);
  } else if (typeof value === 'string' && propNameLowerCase !== 'src') {
    return value.toLowerCase();
  }
  return value;
}

module.exports = normalizeFontPropertyValue;
