const cssFontWeightNames = require('css-font-weight-names');

function normalizeFontWeight(value) {
  return parseInt(cssFontWeightNames[value] || value);
}

module.exports = normalizeFontWeight;
