function gatherStylesheetsWithPredicates(document) {
  const stylesheetsWithPredicates = [];
  for (const stylesheet of Array.from(document.styleSheets)) {
    const predicates = {};
    if (
      stylesheet.media &&
      stylesheet.media.mediaText &&
      stylesheet.media.mediaText !== 'all'
    ) {
      predicates[`mediaQuery:${stylesheet.media.mediaText}`] = true;
    }

    stylesheetsWithPredicates.push({
      text: Array.from(stylesheet.cssRules)
        .map(cssRule => cssRule.cssText)
        .join('\n'),

      predicates
    });
  }
  return stylesheetsWithPredicates;
}

module.exports = gatherStylesheetsWithPredicates;
