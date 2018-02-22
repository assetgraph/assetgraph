// Object.assign-like function that turns the values into nulls in case of mismatches
// Returns undefined if combining the predicates would result in a conflict,
// eg. combinePredicates([{ 'mediaQuery:3dglasses': false }, { 'mediaQuery:3dglasses': true }])
function combinePredicates(predicatesArray) {
  // ...
  const combinedPredicates = {};
  for (let i = 0; i < predicatesArray.length; i += 1) {
    const predicates = predicatesArray[i];
    const predicateNames = Object.keys(predicates);
    for (let j = 0; j < predicateNames.length; j += 1) {
      const predicateName = predicateNames[j];
      const value = predicates[predicateName];
      if (typeof combinedPredicates[predicateName] === 'undefined') {
        combinedPredicates[predicateName] = value;
      } else if (combinedPredicates[predicateName] !== value) {
        return; // Conflict, return undefined
      }
    }
  }
  return combinedPredicates;
}

module.exports = combinePredicates;
