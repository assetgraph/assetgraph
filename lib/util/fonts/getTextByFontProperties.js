var _ = require('lodash');
var defaultStylesheet = require('./defaultStylesheet');
var stylePropObjectComparator = require('./stylePropObjectComparator');
var unquote = require('./unquote');
var memoizeSync = require('memoizesync');
var cssFontWeightNames = require('css-font-weight-names');
var cssPseudoElementRegExp = require('../cssPseudoElementRegExp');
var getPseudoElements = require('./getPseudoElements');
var stripPseudoClassesFromSelector = require('./stripPseudoClassesFromSelector');
var gatherStylesheetsWithIncomingMedia = require('./gatherStylesheetsWithIncomingMedia');

var FONT_PROPS = [
    'font-family',
    'font-weight',
    'font-style'
];

var INITIAL_VALUES = {
    // 'font-family': 'serif'
    'font-weight': 400,
    'font-style': 'normal'
};

var NAME_CONVERSIONS = {
    'font-weight': cssFontWeightNames
};

function createPredicatePermutations(predicatesToVary, i) {
    if (typeof i !== 'number') {
        i = 0;
    }
    if (i < predicatesToVary.length) {
        var permutations = [];
        createPredicatePermutations(predicatesToVary, i + 1).forEach(function (permutation) {
            var permutationWithPredicateOff = Object.assign({}, permutation);
            permutationWithPredicateOff[predicatesToVary[i]] = true;
            permutations.push(permutation, permutationWithPredicateOff);
        });
        return permutations;
    } else {
        return [ {} ];
    }
}

var excludedNodes = ['HEAD', 'STYLE', 'SCRIPT'];

function getNodeIdArray(node) {
    var idArray = [];
    var currentNode = node;
    var childNodes;

    while (currentNode.parentNode) {
        childNodes = Array.prototype.slice.call(currentNode.parentNode.childNodes)
            .filter(function (node) {
                return node.nodeType === 1  && excludedNodes.indexOf(node.tagName) === -1;
            });

        idArray.push(childNodes.indexOf(currentNode));

        currentNode = currentNode.parentNode;
    }

    return idArray.reverse();
}

function getFontRulesWithDefaultStylesheetApplied(htmlAsset, memoizedGetCssRulesByProperty) {
    var fontPropRules = [{ text: defaultStylesheet, incomingMedia: [] }].concat(gatherStylesheetsWithIncomingMedia(htmlAsset.assetGraph, htmlAsset))
        .map(function (stylesheetAndIncomingMedia) {
            return memoizedGetCssRulesByProperty(FONT_PROPS, stylesheetAndIncomingMedia.text, stylesheetAndIncomingMedia.incomingMedia);
        })
        .reduce(function (rules, current) {
            // Input:
            // [
            //     {
            //         'font-style': [],
            //         'font-weight': [],
            //         'font-family': []
            //     },
            //     {
            //         'font-style': [],
            //         'font-weight': [],
            //         'font-family': []
            //     },
            //     {
            //         'font-style': [],
            //         'font-weight': [],
            //         'font-family': []
            //     }
            // ]

            // Output:
            // {
            //     'font-style': [].concat([], [], []),
            //     'font-weight': [].concat([], [], []),
            //     'font-family': [].concat([], [], [])
            // }
            Object.keys(current).forEach(function (prop) {
                if (!rules[prop]) {
                    rules[prop] = [];
                }

                rules[prop] = rules[prop].concat(current[prop]);
            });

            return rules;
        }, {});

    Object.keys(fontPropRules).forEach(function (prop) {
        fontPropRules[prop].sort(stylePropObjectComparator(fontPropRules[prop]));
    });

    return fontPropRules;
}

function getMemoizedElementStyleResolver(fontPropRules, availableWeights, memoizedGetCssRulesByProperty) {
    var nonInheritingTags = ['BUTTON', 'INPUT', 'OPTION', 'TEXTAREA'];

    var getComputedStyle = memoizeSync(function (node, idArray, truePredicates, falsePredicates) {
        truePredicates = truePredicates || {};
        falsePredicates = falsePredicates || {};
        var localFontPropRules = Object.assign({}, fontPropRules);
        var props = Object.keys(fontPropRules);
        var result = {};

        // Stop condition. We moved above <HTML>
        if (!node.tagName) {
            props.forEach(function (prop) {
                result[prop] = [ { value: INITIAL_VALUES[prop], truePredicates: truePredicates, falsePredicates: falsePredicates }];
            });
            return result;
        }

        if (node.getAttribute('style')) {
            var attributeStyles = memoizedGetCssRulesByProperty(FONT_PROPS, 'bogusselector { ' + node.getAttribute('style') + ' }', []);

            Object.keys(attributeStyles).forEach(function (prop) {
                if (attributeStyles[prop].length > 0) {
                    var concatRules = attributeStyles[prop].concat(localFontPropRules[prop]);
                    localFontPropRules[prop] = concatRules.sort(stylePropObjectComparator(concatRules));
                }
            });
        }

        function traceProp(prop, startIndex, truePredicates, falsePredicates) {
            startIndex = startIndex || 0;

            for (var i = startIndex; i < localFontPropRules[prop].length; i += 1) {
                var declaration = localFontPropRules[prop][i];
                // Skip to the next rule if we are doing a trace where one of the incoming media attributes are already assumed false:
                if (declaration.incomingMedia.some(function (incomingMedia) { return falsePredicates['incomingMedia:' + incomingMedia]; })) {
                    continue;
                }

                // Style attributes always have a specificity array of [1, 0, 0, 0]
                var isStyleAttribute = declaration.specificityArray[0] === 1;
                var selectorWithoutPseudoClasses = !isStyleAttribute && stripPseudoClassesFromSelector(declaration.selector);

                // Pseudo elements are handled elsewhere, and Jsdom crashes if we execute a node.matches on this selector
                if (!isStyleAttribute && declaration.selector.match(cssPseudoElementRegExp)) {
                    continue;
                }

                if (isStyleAttribute || node.matches(selectorWithoutPseudoClasses)) {
                    var hypotheticalValues;
                    if (declaration.value === 'inherit' || declaration.value === 'unset') {
                        hypotheticalValues = getComputedStyle(node.parentNode, idArray.slice(0, -1), truePredicates, falsePredicates)[prop];
                    } else {
                        var value;
                        if (declaration.value === 'initial') {
                            value = INITIAL_VALUES[prop];
                        } else if (NAME_CONVERSIONS[prop] && NAME_CONVERSIONS[prop][declaration.value]) {
                            value = NAME_CONVERSIONS[prop][declaration.value];
                        } else if (prop === 'font-weight') {
                            if (declaration.value === 'lighter' || declaration.value === 'bolder') {
                                var inheritedWeight = getComputedStyle(node.parentNode, idArray.slice(0, -1))[prop];
                                if (declaration.value === 'lighter') {
                                    value = availableWeights[availableWeights.indexOf(inheritedWeight[0]) - 1] || inheritedWeight;
                                }
                                if (declaration.value === 'bolder') {
                                    value = availableWeights[availableWeights.indexOf(inheritedWeight[0]) + 1] || inheritedWeight;
                                }
                            } else {
                                value = Number(declaration.value);
                            }
                        } else if (prop === 'font-family') {
                            value = unquote(declaration.value);
                        } else {
                            value = declaration.value;
                        }

                        hypotheticalValues = [ { value: value, truePredicates: truePredicates, falsePredicates: falsePredicates } ];
                    }

                    var predicatesToVary = [];
                    if (!isStyleAttribute && selectorWithoutPseudoClasses !== declaration.selector) {
                        predicatesToVary.push('selectorWithPseudoClasses:' + declaration.selector);
                    }
                    if (declaration.mediaQuery) {
                        predicatesToVary.push('mediaQuery:' + declaration.mediaQuery);
                    }
                    Array.prototype.push.apply(predicatesToVary, declaration.incomingMedia.map(function (incomingMedia) {
                        return 'incomingMedia:' + incomingMedia;
                    }));
                    if (predicatesToVary.length > 0) {
                        var multipliedHypotheticalValues = [];
                        createPredicatePermutations(predicatesToVary).forEach(function (predicatePermutation) {
                            if (Object.keys(predicatePermutation).length === 0) {
                                return;
                            }
                            var truePredicatesForThisPermutation = Object.assign({}, truePredicates, predicatePermutation);
                            if (declaration.incomingMedia.every(function (incomingMedia) { return truePredicatesForThisPermutation['incomingMedia:' + incomingMedia]; })) {
                                Array.prototype.push.apply(
                                    multipliedHypotheticalValues,
                                    hypotheticalValues.map(function (hypotheticalValue) {
                                        return {
                                            value: hypotheticalValue.value,
                                            truePredicates: truePredicatesForThisPermutation,
                                            falsePredicates: falsePredicates
                                        };
                                    })
                                );
                            }
                            Array.prototype.push.apply(
                                multipliedHypotheticalValues,
                                traceProp(prop, i + 1, truePredicates, Object.assign({}, falsePredicates, predicatePermutation))
                            );
                        });
                        return multipliedHypotheticalValues;
                    } else {
                        return hypotheticalValues;
                    }
                }
            }

            if (nonInheritingTags.indexOf(node.tagName) === -1) {
                return getComputedStyle(node.parentNode, idArray.slice(0, -1), truePredicates, falsePredicates)[prop];
            } else {
                return [ { value: INITIAL_VALUES[prop], truePredicates: truePredicates, falsePredicates: falsePredicates }];
            }
        }

        props.forEach(function (prop) {
            result[prop] = traceProp(prop, 0, truePredicates, falsePredicates);
        });

        return result;
    }, {
        argumentsStringifier: function (args) {
            return (
                args[1].join(',') + '\x1e' +
                (args[2] ? Object.keys(args[2]).join('\x1d') : '') + '\x1e' +
                (args[3] ? Object.keys(args[3]).join('\x1d') : '')
            );
        }
    });

    return getComputedStyle;
}

function getTextByFontProperties(htmlAsset, availableWeights, memoizedGetCssRulesByProperty) {
    if (!htmlAsset || htmlAsset.type !== 'Html'  || !htmlAsset.assetGraph) {
        throw new Error('htmlAsset must be a Html-asset and be in an assetGraph');
    }

    if (availableWeights && !Array.isArray(availableWeights)) {
        throw new Error('availableWeights must be an array of css font weights');
    }

    availableWeights = availableWeights || [];

    var fontPropRules = getFontRulesWithDefaultStylesheetApplied(htmlAsset, memoizedGetCssRulesByProperty);
    var getComputedStyle = getMemoizedElementStyleResolver(fontPropRules, availableWeights, memoizedGetCssRulesByProperty);

    var document = htmlAsset.parseTree;

    var textNodes = [];
    var nonTextnodes = [];
    var visualValueInputTypes = [
        'date',
        'datetime-local',
        'email',
        'month',
        'number',
        'reset',
        'search',
        'submit',
        'tel',
        'text',
        'time',
        'url',
        'week'
    ];

    var pseudoElements = getPseudoElements(htmlAsset);

    (function traversePreOrder(node, idArray) {
        if (node.nodeType === 1) {
            if (!idArray) {
                idArray = [0];
            }

            var currentIndex = 0;
            var child = node.firstChild;

            // Inputs might have visual text, but don't have childNodes
            if (node.tagName === 'INPUT' && visualValueInputTypes.indexOf(node.type || 'text') !== -1) {
                var inputValue = (node.value || '').trim();
                var inputPlaceholder = (node.placeholder || '').trim();

                if (inputValue) {
                    nonTextnodes.push({
                        text: inputValue,
                        node: node,
                        id: idArray
                    });
                }

                if (inputPlaceholder) {
                    nonTextnodes.push({
                        text: inputPlaceholder,
                        node: node,
                        id: idArray
                    });
                }
            }

            while (child) {
                if (child.nodeType === 3 && child.textContent.trim()) {
                    textNodes.push({
                        node: child,
                        parentId: idArray
                    });
                }

                if (child.nodeType === 1 && excludedNodes.indexOf(child.tagName) === -1) {
                    traversePreOrder(child, idArray.concat(currentIndex));
                    currentIndex += 1;
                }

                child = child.nextSibling;
            }
        }
    }(document.body.parentNode));

    var styledTexts = textNodes
        .map(function (textNodeObj) {
            return {
                text: textNodeObj.node.textContent.trim(),
                props: getComputedStyle(textNodeObj.node.parentNode, textNodeObj.parentId)
            };
        })
        .concat(pseudoElements.map(function (pseudoElement) {
            return {
                text: pseudoElement.textContent.trim(),
                props: getComputedStyle(pseudoElement, getNodeIdArray(pseudoElement.parentNode).concat([0]))
            };
        }))
        .concat(nonTextnodes.map(function (nodeObj) {
            return {
                text: nodeObj.text,
                props: getComputedStyle(nodeObj.node, nodeObj.id)
            };
        }));

    // propsByText Before:
    // [
    //     {
    //         text: 'foo',
    //         props: {
    //             'font-family': [ { value: 'a', truePredicates: Set, falsePredicates: Set }, { value: 'b', truePredicates: Set, falsePredicates: Set }],
    //             'font-style': [ { value: 'normal', truePredicates: Set, falsePredicates: Set } ],
    //             'font-weight': [ { value: 400, truePredicates: Set, falsePredicates: Set }, { value: 700, truePredicates: Set, falsePredicates: Set }]
    //         }
    //     },
    //     ...
    // ]

    // Expand into all permutations in case of multiple hypothetical values:
    function expandPermutations(styledText, propertyNames) {
        propertyNames = propertyNames || Object.keys(styledText.props);
        var permutations = [];
        var firstPropertyName = propertyNames[0];
        var firstPropertyValues = styledText.props[propertyNames[0]];

        for (var i = 0 ; i < Math.max(1, firstPropertyValues.length) ; i += 1) {
            if (propertyNames.length > 1) {
                expandPermutations(styledText, propertyNames.slice(1)).forEach(function (permutation) {
                    permutation[firstPropertyName] = firstPropertyValues[i];
                    permutations.push(permutation);
                });
            } else {
                var permutation = {};
                permutation[firstPropertyName] = firstPropertyValues[i];
                permutations.push(permutation);
            }
        }

        return permutations;
    }

    var multipliedStyledTexts = _.flatten(styledTexts.map(function (styledText) {
        var deduplicatedExpandedPermutations = [];
        var seenPermutationByKey = {};
        expandPermutations(styledText)
            .filter(function (hypotheticalValuesByProp) {
                // Check that none of the predicates assumed true are assumed false, too:
                return FONT_PROPS.every(function (prop) {
                    return Object.keys(hypotheticalValuesByProp[prop].truePredicates).every(function (truePredicate) {
                        return FONT_PROPS.every(function (otherProp) {
                            return !hypotheticalValuesByProp[otherProp].falsePredicates[truePredicate];
                        });
                    });
                });
            })
            .forEach(function (hypotheticalValuesByProp) {
                // Unwrap the "hypothetical value" objects:
                var permutationKey = '';
                var props = {};
                FONT_PROPS.forEach(function (prop) {
                    permutationKey += prop + '\x1d' + hypotheticalValuesByProp[prop].value + '\x1d';
                    props[prop] = hypotheticalValuesByProp[prop].value;
                });
                // Deduplicate:
                if (!seenPermutationByKey[permutationKey]) {
                    seenPermutationByKey[permutationKey] = true;
                    deduplicatedExpandedPermutations.push({
                        text: styledText.text,
                        props: props
                    });
                }
            });
        return deduplicatedExpandedPermutations;
    }));

    // multipliedStyledTexts After:
    // [
    //     {
    //         text: 'foo',
    //         props: {
    //             'font-family': 'a',
    //             'font-style': 'normal',
    //             'font-weight': 400
    //         }
    //     },
    //     {
    //         text: 'foo',
    //         props: {
    //             'font-family': 'b',
    //             'font-style': 'normal',
    //             'font-weight': 400
    //         }
    //     },
    //     {
    //         text: 'foo',
    //         props: {
    //             'font-family': 'a',
    //             'font-style': 'normal',
    //             'font-weight': 700
    //         }
    //     },
    //     {
    //         text: 'foo',
    //         props: {
    //             'font-family': 'b',
    //             'font-style': 'normal',
    //             'font-weight': 700
    //         }
    //     },
    //     ...
    // ]

    return multipliedStyledTexts;
}

module.exports = getTextByFontProperties;
