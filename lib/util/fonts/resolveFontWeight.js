function resolveFontWeight(weight, availableWeights) {
    if (availableWeights.includes(weight)) {
        return weight;
    }

    var value;
    var sortedWeights = availableWeights.slice().sort(function (a, b) { return a - b; });

    if (weight === 400 && availableWeights.includes(500)) {
        return 500;
    }

    if (weight === 500 && availableWeights.includes(400)) {
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
