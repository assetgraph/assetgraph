var expandPermutations = require('./expandPermutations');

function arePredicatesExhaustive(predicatesArray) {
  var seenPredicateNames = {};
  predicatesArray.forEach(predicates => {
    Object.keys(predicates).forEach(predicateName => {
      seenPredicateNames[predicateName] = true;
    });
  });
  return expandPermutations(
    Object.keys(seenPredicateNames).reduce(
      // eslint-disable-next-line no-sequences
      (acc, predicateName) => ((acc[predicateName] = [true, false]), acc),
      {}
    )
  ).every(permutation =>
    predicatesArray.some(predicates =>
      Object.keys(seenPredicateNames).every(
        predicateName =>
          predicates[predicateName] === undefined ||
          predicates[predicateName] === permutation[predicateName]
      )
    )
  );
}

module.exports = arePredicatesExhaustive;
