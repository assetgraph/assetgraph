// This implementation follows the font matching algorithm from https://www.w3.org/TR/css-fonts-3/#font-style-matching
const _ = require('lodash');
const unquote = require('./unquote');
const resolveFontWeight = require('./resolveFontWeight');
const normalizeFontPropertyValue = require('./normalizeFontPropertyValue');
const initialValueByProp = _.pick(require('./initialValueByProp'), [
  'font-family',
  'font-stretch',
  'font-weight',
  'font-style'
]);

const normalizedInitialValueByProp = {};
for (const prop of Object.keys(initialValueByProp)) {
  normalizedInitialValueByProp[prop] = normalizeFontPropertyValue(
    prop,
    initialValueByProp[prop]
  );
}

const fontStretchValues = [
  'ultra-condensed',
  'extra-condensed',
  'condensed',
  'semi-condensed',
  'normal',
  'semi-expanded',
  'expanded',
  'extra-expanded',
  'ultra-expanded'
];

// font-style lookup order
const styleLookupOrder = {
  normal: ['normal', 'oblique', 'italic'],
  italic: ['italic', 'oblique', 'normal'],
  oblique: ['oblique', 'italic', 'normal']
};

function ascending(a, b) {
  return a - b;
}

/**
 * @typedef {Object} FontFaceDeclaration
 * @property {String} font-family - CSS [font-family](https://developer.mozilla.org/en-US/docs/Web/CSS/font-family) property
 * @property {String} font-stretch - CSS [font-stretch](https://developer.mozilla.org/en-US/docs/Web/CSS/font-stretch) property
 * @property {String} font-weight - CSS [font-weight](https://developer.mozilla.org/en-US/docs/Web/CSS/font-weight) property, must be normalized to numbers
 * @property {String} font-style - CSS [font-style](https://developer.mozilla.org/en-US/docs/Web/CSS/font-style) property
 */

/**
 * Font style matching algorithm as described in https://www.w3.org/TR/css-fonts-3/#fontstylematchingalg
 * @param  {FontFaceDeclaration[]} fontFaceDeclarations - Array of FontFaceDeclarations to match against
 * @param  {FontFaceDeclaration}   propsToSnap          - FontFaceDeclaration to match against fontFaceDeclarations
 *
 * @return {FontFaceDeclaration} The nearest match from fontFaceDeclarations
 */
function snapToAvailableFontProperties(fontFaceDeclarations, propsToSnap) {
  if (!Array.isArray(fontFaceDeclarations)) {
    throw new TypeError('fontFaceDeclarations must be an array');
  }
  if (
    typeof propsToSnap !== 'object' ||
    Array.isArray(propsToSnap) ||
    propsToSnap === null
  ) {
    throw new TypeError('propsToSnap must be an object');
  }

  // Fill in initial values for missing properties
  fontFaceDeclarations = fontFaceDeclarations.map(fontFaceDeclaration => ({
    ...normalizedInitialValueByProp,
    ...fontFaceDeclaration
  }));
  propsToSnap = { ...normalizedInitialValueByProp, ...propsToSnap };

  // System font, we can't know about the full properties. Early exit
  if (typeof propsToSnap['font-family'] === 'undefined') {
    return undefined;
  }

  // Match font-family first
  // FIXME: Does not support , inside the quotes:
  const fontFamilies = propsToSnap['font-family'].split(/, */).map(unquote);
  // Naively assume that the first defined font family is the one we are looking for. If it's a webfont it should be likely
  const familyMatches = fontFaceDeclarations.filter(
    fontFaceDeclaration =>
      fontFaceDeclaration['font-family'].toLowerCase() ===
      fontFamilies[0].toLowerCase()
  );

  // No match for font-family. Probably not a web font. Early exit
  if (familyMatches.length === 0) {
    return undefined;
  }

  // Find the best font-stretch
  const stretchStartIndex = fontStretchValues.indexOf(
    propsToSnap['font-stretch'].toLowerCase()
  );
  const stretchGroups = _.groupBy(familyMatches, familyMatch =>
    familyMatch['font-stretch'].toLowerCase()
  );

  let firstHalf, lastHalf, stretchSearchOrder;
  let stretchMatches = [];

  if (stretchStartIndex <= fontStretchValues.indexOf('normal')) {
    // When value is 'normal' or lower, check denser values first, then less dense
    firstHalf = fontStretchValues.slice(0, stretchStartIndex + 1);
    lastHalf = fontStretchValues.slice(
      stretchStartIndex + 1 - fontStretchValues.length
    );

    stretchSearchOrder = [...firstHalf.reverse(), ...lastHalf];
  } else {
    // When value is less dense than 'normal', check expanded values first, then denser ones
    firstHalf = fontStretchValues.slice(
      stretchStartIndex - fontStretchValues.length
    );
    lastHalf = fontStretchValues.slice(0, stretchStartIndex);

    stretchSearchOrder = [...firstHalf, ...lastHalf.reverse()];
  }

  stretchSearchOrder.some(value => {
    if (stretchGroups[value]) {
      stretchMatches = stretchGroups[value];
      return true;
    }
  });

  // Find the best font-style
  const styleMatches = styleLookupOrder[propsToSnap['font-style'].toLowerCase()]
    .map(style =>
      stretchMatches.filter(
        stretchMatch => stretchMatch['font-style'].toLowerCase() === style
      )
    )
    .find(list => list.length > 0);

  // Find the best font-weight
  const desiredWeight = propsToSnap['font-weight'];
  const availableFontWeights = styleMatches
    .map(m => normalizeFontPropertyValue('font-weight', m['font-weight']))
    .sort(ascending);
  let resolvedWeight;

  const [value, ...operations] = String(desiredWeight).split('+');
  const startWeight = resolveFontWeight(
    normalizeFontPropertyValue('font-weight', value),
    availableFontWeights
  );

  // Non-standard syntax from Assetgraph font tooling:
  // '400+lighter+lighter'
  // '200+bolder+bolder'
  resolvedWeight = operations.reduce((result, current) => {
    const indexModifier = current === 'lighter' ? -1 : +1;
    const nextIndex = availableFontWeights.indexOf(result) + indexModifier;

    return availableFontWeights[nextIndex] || result;
  }, startWeight);
  return styleMatches.find(
    styleMatch =>
      normalizeFontPropertyValue('font-weight', styleMatch['font-weight']) ===
      resolvedWeight
  );
}

module.exports = snapToAvailableFontProperties;
