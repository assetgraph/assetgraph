function resolveFontWeight(weight, availableWeights) {
    weight = parseInt(weight);

    if (availableWeights.indexOf(weight) !== -1) {
        return weight;
    }

    var value;
    var sortedWeights = availableWeights.slice().sort(function (a, b) { return a - b; });

    if (weight === 400 && availableWeights.indexOf(500) !== -1) {
        return 500;
    }

    if (weight === 500 && availableWeights.indexOf(400) !== -1) {
        return 400;
    }

    if (weight <= 400) {
        sortedWeights.forEach(function (possibleWeight) {
            if (possibleWeight < 400) {
                value = possibleWeight;
            } else if (!value) {
                value = possibleWeight;
            }
        });

        return value;
    }

    if (weight >= 500) {
        sortedWeights.slice().reverse().forEach(function (possibleWeight) {
            if (possibleWeight > 500) {
                value = possibleWeight;
            } else if (!value) {
                value = possibleWeight;
            }
        });

        return value;
    }
}

module.exports = resolveFontWeight;
