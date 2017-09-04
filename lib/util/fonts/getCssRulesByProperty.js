var specificity = require('specificity');
var postcss = require('postcss');
var cssFontParser = require('css-font-parser');
var charactersByListStyleType = require('./charactersByListStyleType');

var INITIAL_VALUES = {
    // 'font-family': 'serif',
    'font-weight': 400,
    'font-style': 'normal'
};

function eachDeclarationInParseTree(ruleOrStylesheet, lambda) {
    var mediaQuery;
    (function visit(node) {
        // Check for selector. We might be in an at-rule like @font-face
        if (node.type === 'decl' && node.parent.selector) {
            lambda(node, mediaQuery);
        }

        if (node.nodes) {
            if (node.name === 'media') {
                if (typeof mediaQuery !== 'undefined') {
                    throw new Error('Nested media queries are not supported');
                }
                mediaQuery = node.params;
            }
            node.nodes.forEach(function (childNode) {
                visit(childNode);
            });
            if (node.name === 'media') {
                mediaQuery = undefined;
            }
        }
    }(ruleOrStylesheet));
}

function getCssRulesByProperty(properties, cssSource, incomingMedia) {
    if (!Array.isArray(properties)) {
        throw new Error('properties argument must be an array');
    }
    if (typeof cssSource !== 'string') {
        throw new Error('cssSource argument must be a string containing valid CSS');
    }
    if (!Array.isArray(incomingMedia)) {
        throw new Error('incomingMedia argument must be an array');
    }

    var parseTree = postcss.parse(cssSource);

    var rulesByProperty = {};

    properties.forEach(function (property) {
        rulesByProperty[property] = [];
    });

    eachDeclarationInParseTree(parseTree, function (node, mediaQuery) {
        if (properties.indexOf(node.prop) !== -1) {
            // Split up combined selectors as they might have different specificity
            specificity.calculate(node.parent.selector)
                .forEach(function (specificityObject) {
                    var isStyleAttribute = specificityObject.selector === 'bogusselector';

                    rulesByProperty[node.prop].push({
                        incomingMedia: incomingMedia,
                        mediaQuery: mediaQuery,
                        selector: isStyleAttribute ? undefined : specificityObject.selector.trim(),
                        specificityArray: isStyleAttribute ? [1, 0, 0, 0] : specificityObject.specificityArray,
                        prop: node.prop,
                        value: node.value,
                        important: !!node.important
                    });
                });
        } else if (node.prop === 'list-style' && properties.indexOf('list-style-type') !== -1) { // Shorthand
            var listStyleType;
            node.value.replace(/"((?:[^"]|\\.)*")|'((?:[^']|\\.)*)'|([^'"]+)/, function ($0, doubleQuotedString, singleQuotedString, other) {
                if (typeof doubleQuotedString === 'string') {
                    listStyleType = doubleQuotedString;
                } else if (typeof singleQuotedString === 'string') {
                    listStyleType = singleQuotedString;
                } else if (other) {
                    other.trim().split(' ').forEach(function (otherFragment) {
                        if (typeof charactersByListStyleType[otherFragment] === 'string') {
                            listStyleType = otherFragment;
                        }
                    });
                }
            });

            if (typeof listStyleType !== 'undefined') {
                // Split up combined selectors as they might have different specificity
                specificity.calculate(node.parent.selector)
                    .forEach(function (specificityObject) {
                        var isStyleAttribute = specificityObject.selector === 'bogusselector';

                        rulesByProperty['list-style-type'].push({
                            incomingMedia: incomingMedia,
                            mediaQuery: mediaQuery,
                            selector: isStyleAttribute ? undefined : specificityObject.selector.trim(),
                            specificityArray: isStyleAttribute ? [1, 0, 0, 0] : specificityObject.specificityArray,
                            prop: 'list-style-type',
                            value: listStyleType,
                            important: !!node.important
                        });
                    });
            }
        } else if (node.prop === 'font') { // Shorthand
            var fontProperties = cssFontParser(node.value);

            // If the shorthand value was invalid we get null in return
            if (fontProperties === null) {
                return;
            }

            if (Array.isArray(fontProperties['font-family'])) {
                fontProperties['font-family'] = fontProperties['font-family']
                    .map(function quoteIfNeeded(family) {
                        if (family.indexOf(' ') !== -1) {
                            return '"' + family + '"';
                        }

                        return family;
                    })
                    .join(', ');
            }

            fontProperties = Object.assign({}, INITIAL_VALUES, fontProperties);

            specificity.calculate(node.parent.selector)
                .forEach(function (specificityObject) {
                    Object.keys(fontProperties)
                        .forEach(function (prop) {
                            var value = fontProperties[prop];
                            var isStyleAttribute = specificityObject.selector === 'bogusselector';

                            if (Array.isArray(rulesByProperty[prop])) {
                                rulesByProperty[prop].push({
                                    incomingMedia: [],
                                    selector: isStyleAttribute ? undefined : specificityObject.selector.trim(),
                                    specificityArray: isStyleAttribute ? [1, 0, 0, 0] : specificityObject.specificityArray,
                                    prop: prop,
                                    value: value,
                                    important: !!node.important
                                });
                            }
                        });
                });

        }
    });

    // TODO: Collapse into a single object for duplicate values?

    return rulesByProperty;
}

module.exports = getCssRulesByProperty;
