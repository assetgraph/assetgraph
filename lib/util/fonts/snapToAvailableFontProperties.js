// This implementation follows the font matching algorithm from https://www.w3.org/TR/css-fonts-3/#font-style-matching
var _ = require('lodash');
var resolveFontWeight = require('./resolveFontWeight');

// font-style lookup order
var styleLookupOrder = {
    normal: ['normal', 'oblique', 'italic'],
    italic: ['italic', 'oblique', 'normal'],
    oblique: ['oblique', 'italic', 'normal']
};

// var INITIAL_VALUES = {
//     'font-weight': 400,
//     'font-style': 'normal'
// };

function snapToAvailableFontProperties(availableFontProperties, propsToSnap) {
    // System font, we can't know about the full properties. Early exit
    if (typeof propsToSnap['font-family'] === 'undefined') {
        return propsToSnap;
    }

    // Match font-family first
    var matchingFamilyProps = _.filter(availableFontProperties, { 'font-family': propsToSnap['font-family'] });

    // No match for font-family. Probably not a web font. Early exit
    if (matchingFamilyProps.length === 0) {
        return propsToSnap;
    }

    // Find the best font-style with weights defined
    var matchingStyleProps = styleLookupOrder[propsToSnap['font-style']]
        .map(function (style) {
            return _.filter(matchingFamilyProps, { 'font-style': style });
        })
        .find(function (list) {
            return list.length > 0;
        });

    if (!matchingStyleProps) {
        return propsToSnap;
    }

    var desiredWeight = propsToSnap['font-weight'];
    var availableFontWeights = _.map(matchingStyleProps, 'font-weight');
    var resolvedWeight;

    if (typeof desiredWeight === 'string') {
        // lighter or bolder
        var operations = desiredWeight.split('+');
        var startWeight = resolveFontWeight(operations.shift(), availableFontWeights);

        resolvedWeight = operations.reduce(function (result, current) {
            var indexModifier = current === 'lighter' ? -1 : +1;
            var nextIndex = availableFontWeights.indexOf(result) + indexModifier;

            return availableFontWeights[nextIndex] || result;
        }, startWeight);
    } else {
        resolvedWeight = resolveFontWeight(desiredWeight, availableFontWeights);
    }

    return {
        'font-family': propsToSnap['font-family'],
        'font-style': matchingStyleProps[0]['font-style'],
        'font-weight': resolvedWeight
    };
}

module.exports = snapToAvailableFontProperties;
