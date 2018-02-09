// Expand an object with array values into all possible permutations of the properties

// expandPermutations({a: [1, 2], b: [3, 4]}) =>
// [
//   { b: 3, a: 1 },
//   { b: 4, a: 1 },
//   { b: 3, a: 2 },
//   { b: 4, a: 2 }
// ]

function expandPermutations(obj, propertyNames) {
  propertyNames = propertyNames || Object.keys(obj);
  var permutations = [];
  if (propertyNames.length === 0) {
    return [];
  }
  var firstPropertyName = propertyNames[0];
  var firstPropertyValues = obj[propertyNames[0]];

  for (var i = 0; i < Math.max(1, firstPropertyValues.length); i += 1) {
    if (propertyNames.length > 1) {
      expandPermutations(obj, propertyNames.slice(1)).forEach(function(
        permutation
      ) {
        permutation[firstPropertyName] = firstPropertyValues[i];
        permutations.push(permutation);
      });
    } else {
      var permutation = {};
      permutation[firstPropertyName] = firstPropertyValues[i];
      permutations.push(permutation);
    }
  }
  return permutations;
}

module.exports = expandPermutations;
