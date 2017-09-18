var _ = require('lodash');
var defaultStylesheet = require('./defaultStylesheet');
var stylePropObjectComparator = require('./stylePropObjectComparator');
var unquote = require('./unquote');
var memoizeSync = require('memoizesync');
var cssFontWeightNames = require('css-font-weight-names');
var cssPseudoElementRegExp = require('../cssPseudoElementRegExp');
var stripPseudoClassesFromSelector = require('./stripPseudoClassesFromSelector');
var gatherStylesheetsWithIncomingMedia = require('./gatherStylesheetsWithIncomingMedia');
var getCssRulesByProperty = require('./getCssRulesByProperty');
var extractTextFromContentPropertyValue = require('./extractTextFromContentPropertyValue');
var charactersByListStyleType = require('./charactersByListStyleType');
var unescapeCssString = require('./unescapeCssString');

var PROPS = [
    'font-family',
    'font-style',
    'font-weight',
    'content',
    'quotes',
    'list-style-type',
    'display'
];

var PROPS_AND_TEXT = ['text'].concat(PROPS);

var INITIAL_VALUES = {
    // 'font-family': 'serif'
    'font-weight': 400,
    'font-style': 'normal',
    content: 'normal',
    quotes: '"«" "»" "‹" "›" "‘" "’" "\'" "\'" "\\"" "\\""', // Wide default set to account for browser differences
    'list-style-type': 'none',
    display: 'inline'
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

function getFontRulesWithDefaultStylesheetApplied(htmlAsset, memoizedGetCssRulesByProperty) {
    var fontPropRules = [{ text: defaultStylesheet, incomingMedia: [] }].concat(gatherStylesheetsWithIncomingMedia(htmlAsset.assetGraph, htmlAsset))
        .map(function (stylesheetAndIncomingMedia) {
            return memoizedGetCssRulesByProperty(PROPS, stylesheetAndIncomingMedia.text, stylesheetAndIncomingMedia.incomingMedia);
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

function getMemoizedElementStyleResolver(fontPropRules, memoizedGetCssRulesByProperty) {
    var nonInheritingTags = ['BUTTON', 'INPUT', 'OPTION', 'TEXTAREA'];

    var getComputedStyle = memoizeSync(function (node, idArray, truePredicates, falsePredicates) {
        truePredicates = truePredicates || {};
        falsePredicates = falsePredicates || {};
        var localFontPropRules = Object.assign({}, fontPropRules);
        var result = {};

        // Stop condition. We moved above <HTML>
        if (!node.tagName) {
            PROPS.forEach(function (prop) {
                result[prop] = [ { value: INITIAL_VALUES[prop], truePredicates: truePredicates, falsePredicates: falsePredicates }];
            });
            return result;
        }

        if (node.getAttribute('style')) {
            var attributeStyles = memoizedGetCssRulesByProperty(PROPS, 'bogusselector { ' + node.getAttribute('style') + ' }', []);

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
                // Skip to the next rule if we are doing a trace where one of predicates is already assumed false:
                if (Object.keys(declaration.predicates).some(function (predicate) {
                    return falsePredicates[predicate];
                })) {
                    continue;
                }

                // Style attributes always have a specificity array of [1, 0, 0, 0]
                var isStyleAttribute = declaration.specificityArray[0] === 1;
                var strippedSelector = !isStyleAttribute && stripPseudoClassesFromSelector(declaration.selector);
                var hasPseudoClasses = strippedSelector !== declaration.selector;
                var hasPseudoElement = false;

                if (!isStyleAttribute) {
                    var matchPseudoElement = strippedSelector.match(/^(.*?)::?(before|after)$/);
                    if (matchPseudoElement) {
                        hasPseudoElement = true;
                        // The selector ends with :before or :after
                        if (truePredicates['pseudoElement:' + matchPseudoElement[2]]) {
                            strippedSelector = matchPseudoElement[1];
                        } else {
                            // We're not currently tracing this pseudo element, skip this rule
                            continue;
                        }
                    }
                }

                // Check for unsupported pseudo element, eg. select:-internal-list-box optgroup option
                if (!isStyleAttribute && strippedSelector.match(cssPseudoElementRegExp)) {
                    continue;
                }

                if (isStyleAttribute || node.matches(strippedSelector.replace(/ i\]/, ']'))) { // nwmatcher doesn't support the i flag in attribute selectors
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
                                var inheritedWeight = getComputedStyle(node.parentNode, idArray.slice(0, -1), truePredicates, falsePredicates)[prop][0].value;
                                if (declaration.value === 'lighter') {
                                    value = inheritedWeight + '+lighter';
                                }
                                if (declaration.value === 'bolder') {
                                    value = inheritedWeight + '+bolder';
                                }
                            } else {
                                value = Number(declaration.value);
                            }
                        } else if (prop === 'font-family') {
                            value = unquote(declaration.value);
                        } else if (prop !== 'content' || hasPseudoElement) {
                            // content: ... is not inherited, has to be applied directly to the pseudo element
                            value = declaration.value;
                        }

                        hypotheticalValues = [ { value: value, truePredicates: truePredicates, falsePredicates: falsePredicates } ];
                    }

                    var predicatesToVary = Object.keys(declaration.predicates);
                    if (!isStyleAttribute && hasPseudoClasses) {
                        predicatesToVary.push('selectorWithPseudoClasses:' + declaration.selector);
                    }
                    if (predicatesToVary.length > 0) {
                        var multipliedHypotheticalValues = [];
                        createPredicatePermutations(predicatesToVary).forEach(function (predicatePermutation) {
                            if (Object.keys(predicatePermutation).length === 0) {
                                return;
                            }
                            var truePredicatesForThisPermutation = Object.assign({}, truePredicates, predicatePermutation);
                            if (Object.keys(declaration.predicates).every(function (predicate) { return truePredicatesForThisPermutation[predicate]; })) {
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

        PROPS.forEach(function (prop) {
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

function getCounterCharacters(counterStyle, counterStyles) {
    var text = '';
    if (typeof counterStyle.props.symbols === 'string') {
        text += counterStyle.props.symbols.split(' ').join('');
    }
    ['prefix', 'suffix'].forEach(function (propertyName) {
        var value = counterStyle.props[propertyName];
        if (typeof value === 'string') {
            text += unescapeCssString(unquote(value));
        }
    });
    ['additive-symbols', 'pad'].forEach(function (propertyName) {
        var value = counterStyle.props[propertyName];
        if (typeof value === 'string') {
            value.replace(/\d+ (?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|(url\(\s*(?:'(?:[^']|\\')*'|"(?:[^"]|\\")*"|(?:[^'"\\]|\\.)*?\s*)\)))/g, function ($0, doubleQuotedString, singleQuotedString) {
                if (typeof doubleQuotedString === 'string') {
                    text += unescapeCssString(doubleQuotedString);
                } else if (typeof singleQuotedString === 'string') {
                    text += unescapeCssString(singleQuotedString);
                }
            });
        }
    });
    var fallback = counterStyle.props.fallback;
    if (fallback) {
        if (charactersByListStyleType[fallback]) {
            text += charactersByListStyleType[fallback];
        } else {
            counterStyles.forEach(function (counterStyle) {
                if (counterStyle.name === fallback) {
                    text += getCounterCharacters(counterStyle, counterStyles);
                }
            });
        }
    }
    return text;
}

function expandListIndicators(computedStyle, counterStyles) {
    for (var i = 0 ; i < computedStyle.display.length ; i += 1) {
        if (computedStyle.display[i].value === 'list-item') {
            for (var j = 0 ; j < computedStyle['list-style-type'].length ; j += 1) {
                var listStyleType = computedStyle['list-style-type'][j].value;
                var falsePredicates = Object.assign(
                    {},
                    computedStyle.display[i].falsePredicates,
                    computedStyle['list-style-type'][j].falsePredicates
                );
                var truePredicates = Object.assign(
                    {},
                    computedStyle.display[i].truePredicates,
                    computedStyle['list-style-type'][j].truePredicates
                );
                if (/^['"]/.test(listStyleType)) {
                    computedStyle.content.push({
                        value: unescapeCssString(unquote(listStyleType)),
                        falsePredicates: falsePredicates,
                        truePredicates: truePredicates
                    });
                } else {
                    var found = false;
                    counterStyles.forEach(function (counterStyle) {
                        if (counterStyle.name === listStyleType) {
                            found = true;
                            computedStyle.content.push({
                                value: getCounterCharacters(counterStyle, counterStyles),
                                falsePredicates: falsePredicates,
                                truePredicates: Object.assign({}, truePredicates, counterStyle.predicates)
                            });
                        }
                    });
                    if (!found) {
                        computedStyle.content.push({
                            value: charactersByListStyleType[listStyleType],
                            falsePredicates: falsePredicates,
                            truePredicates: truePredicates
                        });
                    }
                }
            }
        }
    }
    return _.omit(computedStyle, '');
}

// memoizedGetCssRulesByProperty is optional
function getTextByFontProperties(htmlAsset, memoizedGetCssRulesByProperty) {
    if (!htmlAsset || htmlAsset.type !== 'Html'  || !htmlAsset.assetGraph) {
        throw new Error('htmlAsset must be a Html-asset and be in an assetGraph');
    }

    memoizedGetCssRulesByProperty = memoizedGetCssRulesByProperty || getCssRulesByProperty;

    var fontPropRules = getFontRulesWithDefaultStylesheetApplied(htmlAsset, memoizedGetCssRulesByProperty);
    var getComputedStyle = getMemoizedElementStyleResolver(fontPropRules, memoizedGetCssRulesByProperty);

    var hypotheticalCounterStylesByName = {};
    fontPropRules.counterStyles.forEach(function (counterStyle) {
        (hypotheticalCounterStylesByName[counterStyle.name] = hypotheticalCounterStylesByName[counterStyle.name] || []).push({
            value: counterStyle.props,
            predicates: counterStyle.predicates
        });
    });

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
            } else {
                nonTextnodes.push({
                    node: node,
                    id: idArray
                });
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

    var styledTexts = [];

    textNodes.forEach(function (textNodeObj) {
        styledTexts.push(
            expandListIndicators(
                Object.assign(
                    { text: [ { value: textNodeObj.node.textContent.trim(), truePredicates: {}, falsePredicates: {} } ] },
                    getComputedStyle(textNodeObj.node.parentNode, textNodeObj.parentId)
                ),
                fontPropRules.counterStyles
            )
        );
    });

    nonTextnodes.forEach(function (nodeObj) {
        styledTexts.push(
            expandListIndicators(
                Object.assign(
                    { text: [ { value: nodeObj.text, truePredicates: {}, falsePredicates: {} } ] },
                    getComputedStyle(nodeObj.node, nodeObj.id)
                ),
                fontPropRules.counterStyles
            )
        );
        ['before', 'after'].forEach(function (pseudoElement) {
            var truePredicates = {};
            truePredicates['pseudoElement:' + pseudoElement] = true;
            var computedStyle = expandListIndicators(
                Object.assign({}, getComputedStyle(nodeObj.node, nodeObj.id, truePredicates)),
                fontPropRules.counterStyles
            );
            var expandedContents = [];
            // Multiply the hypothetical content values with the hypothetical quotes values:
            computedStyle.content.forEach(function (hypotheticalContent) {
                var hypotheticalValues = extractTextFromContentPropertyValue(hypotheticalContent.value, nodeObj.node, computedStyle.quotes, hypotheticalCounterStylesByName);
                hypotheticalValues.forEach(function (hypotheticalValue) {
                    Object.assign(hypotheticalValue.falsePredicates, hypotheticalContent.falsePredicates);
                    Object.assign(hypotheticalValue.truePredicates, hypotheticalContent.truePredicates);
                });
                Array.prototype.push.apply(expandedContents, hypotheticalValues);
            });
            computedStyle.text = expandedContents;
            if (computedStyle.content.length > 0) {
                styledTexts.push(computedStyle);
            }
        });
    });

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
        propertyNames = propertyNames || Object.keys(styledText);
        var permutations = [];
        var firstPropertyName = propertyNames[0];
        var firstPropertyValues = styledText[propertyNames[0]];

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

    var seenPermutationByKey = {};
    var multipliedStyledTexts = _.flatten(styledTexts.map(function (styledText) {
        return expandPermutations(styledText)
            .filter(function removeImpossibleCombinations(hypotheticalValuesByProp) {
                // Check that none of the predicates assumed true are assumed false, too:
                return PROPS_AND_TEXT.every(function (prop) {
                    return Object.keys(hypotheticalValuesByProp[prop].truePredicates).every(function (truePredicate) {
                        return PROPS_AND_TEXT.every(function (otherProp) {
                            return !hypotheticalValuesByProp[otherProp].falsePredicates[truePredicate];
                        });
                    });
                });
            })
            .map(function (hypotheticalValuesByProp) {
                var props = {};
                PROPS_AND_TEXT.forEach(function (prop) {
                    props[prop] = hypotheticalValuesByProp[prop].value;
                });
                return props;
            })
            .filter(function filterAndDeduplicate(textWithProps) {
                if (!textWithProps.text) {
                    return false;
                }
                // Unwrap the "hypothetical value" objects:
                var permutationKey = '';
                ['font-weight', 'font-style', 'font-family', 'text'].forEach(function (prop) {
                    permutationKey += prop + '\x1d' + textWithProps[prop] + '\x1d';
                });

                // Deduplicate:
                if (!seenPermutationByKey[permutationKey]) {
                    seenPermutationByKey[permutationKey] = true;
                    return true;
                }
            })
            // Maybe this mapping step isn't necessary:
            .map(function (styledText) {
                return {
                    text: styledText.text,
                    props: _.omit(styledText, 'content', 'quotes', 'display', 'list-style-type', 'text')
                };
            });
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
