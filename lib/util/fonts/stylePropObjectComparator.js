var specificity = require('specificity');

function stylePropObjectComparator(array, a, b) {
    // Compare importance
    var importanceComparison = b.important - a.important;

    if (importanceComparison !== 0) {
        return importanceComparison;
    }

    // Compare inline style or stylesheet
    var inlineComparison = b.inlineStyle - a.inlineStyle;

    if (inlineComparison !== 0) {
        return inlineComparison;
    }

    // Compare specificity
    var specificityComparison = -1 * specificity.compare(a.specificityArray, b.specificityArray);

    if (specificityComparison !== 0) {
        return specificityComparison;
    }

    // Fall back to sorting by original order
    return array.indexOf(a) - array.indexOf(b);
}

module.exports = function (array) {
    return stylePropObjectComparator.bind(null, array.slice());
};
