function resolveFontWeight(desiredWeight, availableWeights) {
    desiredWeight = parseInt(desiredWeight);

    if (availableWeights.indexOf(desiredWeight) !== -1) {
        return desiredWeight;
    }

    var sortedWeights = availableWeights.slice().sort(function (a, b) { return a - b; });

    if (desiredWeight === 400 && availableWeights.indexOf(500) !== -1) {
        return 500;
    }

    if (desiredWeight === 500 && availableWeights.indexOf(400) !== -1) {
        return 400;
    }

    var above = sortedWeights.filter(function (weight) { return weight > desiredWeight; });
    var below = sortedWeights.filter(function (weight) { return weight < desiredWeight; });
    var searchOrder;

    if (desiredWeight > 500) {
        // If the desired weight is greater than 500, weights above the desired weight are checked in ascending order followed by weights below the desired weight in descending order until a match is found.
        searchOrder = above.concat(below.reverse());
    } else {
        // If the desired weight is less than 400, weights below the desired weight are checked in descending order followed by weights above the desired weight in ascending order until a match is found.
        searchOrder = below.reverse().concat(above);
    }

    return searchOrder[0];
}

module.exports = resolveFontWeight;
