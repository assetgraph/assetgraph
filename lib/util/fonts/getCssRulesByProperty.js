var specificity = require('specificity');
var postcss = require('postcss');
var cssFontParser = require('css-font-parser');
var charactersByListStyleType = require('./charactersByListStyleType');

var INITIAL_VALUES = {
    // 'font-family': 'serif',
    'font-weight': 400,
    'font-style': 'normal'
};

function eachDeclarationInParseTree(ruleOrStylesheet, declarationLambda, counterStyleLambda, keyframesLambda) {
    var mediaQuery;
    (function visit(node) {
        // Check for selector. We might be in an at-rule like @font-face
        if (node.type === 'decl' && node.parent.selector) {
            declarationLambda(node, mediaQuery);
        } else if (node.type === 'atrule' && node.name === 'counter-style' && counterStyleLambda) {
            counterStyleLambda(node, mediaQuery);
        } else if (node.type === 'atrule' && node.name === 'keyframes') {
            if (keyframesLambda) {
                keyframesLambda(node, mediaQuery);
            }
            return;
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

function makePredicates(incomingMedia, mediaQuery) {
    var predicates = {};
    (incomingMedia || []).forEach(function (incomingMedia) {
        if (incomingMedia) {
            predicates['incomingMedia:' + incomingMedia] = true;
        }
    });
    if (mediaQuery) {
        predicates['mediaQuery:' + mediaQuery] = true;
    }
    return predicates;
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

    var rulesByProperty = {
        counterStyles: [],
        keyframes: []
    };

    properties.forEach(function (property) {
        rulesByProperty[property] = [];
    });

    eachDeclarationInParseTree(parseTree, function onCssDeclaration(node, mediaQuery) {
        if (properties.indexOf(node.prop) !== -1) {
            // Split up combined selectors as they might have different specificity
            specificity.calculate(node.parent.selector)
                .forEach(function (specificityObject) {
                    var isStyleAttribute = specificityObject.selector === 'bogusselector';
                    rulesByProperty[node.prop].push({
                        predicates: makePredicates(incomingMedia, mediaQuery),
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
                            predicates: makePredicates(incomingMedia, mediaQuery),
                            selector: isStyleAttribute ? undefined : specificityObject.selector.trim(),
                            specificityArray: isStyleAttribute ? [1, 0, 0, 0] : specificityObject.specificityArray,
                            prop: 'list-style-type',
                            value: listStyleType,
                            important: !!node.important
                        });
                    });
            }
        } else if (node.prop === 'animation' && properties.indexOf('animation-name') !== -1) { // Shorthand
            var animationName = node.value.split(' ').pop();

            // Split up combined selectors as they might have different specificity
            specificity.calculate(node.parent.selector)
                .forEach(function (specificityObject) {
                    var isStyleAttribute = specificityObject.selector === 'bogusselector';

                    rulesByProperty['animation-name'].push({
                        predicates: makePredicates(incomingMedia, mediaQuery),
                        selector: isStyleAttribute ? undefined : specificityObject.selector.trim(),
                        specificityArray: isStyleAttribute ? [1, 0, 0, 0] : specificityObject.specificityArray,
                        prop: 'list-style-type',
                        value: animationName,
                        important: !!node.important
                    });
                });
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
                                    predicates: {},
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
    }, function onCounterStyle(node, mediaQuery) {
        var props = {};
        node.nodes.forEach(function (childNode) {
            props[childNode.prop] = childNode.value;
        });
        rulesByProperty.counterStyles.push({
            name: node.params,
            predicates: makePredicates(incomingMedia, mediaQuery),
            props: props
        });
    }, function onKeyframes(node, mediaQuery) {
        rulesByProperty.keyframes.push({
            name: node.params,
            predicates: makePredicates(incomingMedia, mediaQuery),
            node: node
        });
    });

    // TODO: Collapse into a single object for duplicate values?

    return rulesByProperty;
}

module.exports = getCssRulesByProperty;
