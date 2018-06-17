function ascending(a, b) {
  return a - b;
}

/**
 * Snap a desired font-weight to an available font-weight according to the font-weight snapping
 * algorithm described in https://www.w3.org/TR/css-fonts-3/#fontstylematchingalg
 *
 * @param  {Number} desiredWeight      - The desired font-weight
 * @param  {Number[]} availableWeights - Available font-weights
 *
 * @return {Number} Resulting font-weight after snapping to available weights
 */
function resolveFontWeight(desiredWeight, availableWeights) {
  if (availableWeights.includes(desiredWeight)) {
    return desiredWeight;
  }

  const sortedWeights = availableWeights.slice().sort(ascending);

  if (desiredWeight === 400 && availableWeights.includes(500)) {
    return 500;
  }

  if (desiredWeight === 500 && availableWeights.includes(400)) {
    return 400;
  }

  const above = sortedWeights.filter(weight => weight > desiredWeight);
  const below = sortedWeights.filter(weight => weight < desiredWeight);
  let searchOrder;

  if (desiredWeight > 500) {
    // If the desired weight is greater than 500, weights above the desired weight are checked
    // in ascending order followed by weights below the desired weight in descending order
    // until a match is found.
    searchOrder = [...above, ...below.reverse()];
  } else {
    // If the desired weight is less than 400, weights below the desired weight are checked
    // in descending order followed by weights above the desired weight in ascending order
    // until a match is found.
    searchOrder = [...below.reverse(), ...above];
  }

  return searchOrder[0];
}

module.exports = resolveFontWeight;
