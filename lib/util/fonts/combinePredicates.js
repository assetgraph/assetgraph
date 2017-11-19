// Object.assign-like function that turns the values into nulls in case of mismatches
function combinePredicates() { // ...
    var combinedPredicates = {};
    for (var i = 0 ; i < arguments.length ; i += 1) {
        var predicates = arguments[i];
        Object.keys(predicates).forEach(function (predicate) {
            var value = predicates[predicate];
            if (typeof combinedPredicates[predicate] === 'undefined') {
                combinedPredicates[predicate] = value;
            } else if (combinedPredicates[predicate] !== value) {
                combinedPredicates[predicate] = null; // Conflict marker
            }
        });
    }
    return combinedPredicates;
}

module.exports = combinePredicates;
