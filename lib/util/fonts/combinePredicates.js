// Object.assign-like function that turns the values into nulls in case of mismatches
// Returns undefined if combining the predicates would result in a conflict,
// eg. combinePredicates([{ 'mediaQuery:3dglasses': false }, { 'mediaQuery:3dglasses': true }])
function combinePredicates(predicatesArray) {
  // ...
  var combinedPredicates = {};
  for (var i = 0; i < predicatesArray.length; i += 1) {
    var predicates = predicatesArray[i];
    var predicateNames = Object.keys(predicates);
    for (var j = 0; j < predicateNames.length; j += 1) {
      var predicateName = predicateNames[j];
      var value = predicates[predicateName];
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
