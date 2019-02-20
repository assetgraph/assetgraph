const getTextByFontProperties = require('../lib/util/fonts/getTextByFontProperties');
const gatherStylesheetsWithPredicates = require('./gatherStylesheetsWithPredicates');

window.onload = function() {
  const textByFontProperties = getTextByFontProperties(
    document,
    gatherStylesheetsWithPredicates(document)
  );
  console.dir(textByFontProperties);
};
