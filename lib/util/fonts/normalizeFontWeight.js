const cssFontWeightNames = require('css-font-weight-names');

function normalizeFontWeight(value) {
  if (typeof value === 'string') {
    // FIXME: Stripping the +bolder... suffix here will not always yield the correct result
    // when expanding animations and transitions
    value = value.replace(/\+.*$/, '');
  }
  return parseInt(cssFontWeightNames[value] || value);
}

module.exports = normalizeFontWeight;
