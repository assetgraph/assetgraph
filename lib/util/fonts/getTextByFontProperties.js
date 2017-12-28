var _ = require('lodash');
var defaultStylesheets = require('./defaultStylesheets');
var stylePropObjectComparator = require('./stylePropObjectComparator');
var unquote = require('./unquote');
var memoizeSync = require('memoizesync');
var cssFontWeightNames = require('css-font-weight-names');
var capitalize = require('capitalize');
var cssPseudoElementRegExp = require('../cssPseudoElementRegExp');
var stripPseudoClassesFromSelector = require('./stripPseudoClassesFromSelector');
var gatherStylesheetsWithPredicates = require('./gatherStylesheetsWithPredicates');
var getCssRulesByProperty = require('./getCssRulesByProperty');
var extractTextFromContentPropertyValue = require('./extractTextFromContentPropertyValue');
var counterRendererByListStyleType = require('./counterRendererByListStyleType');
var unescapeCssString = require('./unescapeCssString');
var getCounterCharacters = require('./getCounterCharacters');
var expandPermutations = require('../expandPermutations');
var combinePredicates = require('./combinePredicates');
var arePredicatesExhaustive = require('../arePredicatesExhaustive');

var FONT_PROPS = [
    'font-family',
    'font-style',
    'font-weight'
];

var ALL_PROPS_TO_TRACE = FONT_PROPS.concat([
    'content',
    'quotes',
    'list-style-type',
    'display',
    'animation-name',
    'text-transform',
    'transition-property',
    'transition-duration',
    'counter-increment',
    'counter-reset',
    'counter-set',
    'white-space'
]);

var ALL_PROPS_TO_TRACE_AND_TEXT = ['text'].concat(ALL_PROPS_TO_TRACE);

var INITIAL_VALUES = {
    // 'font-family': 'serif'
    'font-weight': 400,
    'font-style': 'normal',
    content: 'normal',
    quotes: '"«" "»" "‹" "›" "‘" "’" "\'" "\'" "\\"" "\\""', // Wide default set to account for browser differences
    'list-style-type': 'none',
    display: 'inline',
    'animation-name': 'none',
    'text-transform': 'none',
    'transition-property': 'all',
    'transition-duration': '0s',
    'counter-increment': 'none',
    'counter-reset': 'none',
    'counter-set': 'none',
    'white-space': 'normal'
};

var INHERITED = {
    'font-family': true,
    'font-weight': true,
    'font-style': true,
    content: false,
    quotes: true,
    'list-style-type': true,
    display: false,
    'animation-name': false,
    'text-transform': true,
    'transition-property': false,
    'transition-duration': false,
    'counter-increment': false,
    'counter-reset': false,
    'white-space': true
};

var NAME_CONVERSIONS = {
    'font-weight': cssFontWeightNames
};

function createPredicatePermutations(predicatesToVary, predicates, i) {
    if (typeof i !== 'number') {
        i = 0;
    }
    if (i < predicatesToVary.length) {
        var permutations = [];
        createPredicatePermutations(predicatesToVary, predicates, i + 1).forEach(function (permutation) {
            var permutationWithPredicateOff = Object.assign({}, permutation);
            var predicateValue = predicates[predicatesToVary[i]];
            if (typeof predicateValue === 'undefined') {
                predicateValue = true;
            }
            permutationWithPredicateOff[predicatesToVary[i]] = predicateValue;
            permutations.push(permutation, permutationWithPredicateOff);
        });
        return permutations;
    } else {
        return [ {} ];
    }
}

var excludedNodes = ['HEAD', 'STYLE', 'SCRIPT'];

function getFontRulesWithDefaultStylesheetApplied(htmlAsset, memoizedGetCssRulesByProperty) {
    var fontPropRules = defaultStylesheets.concat(gatherStylesheetsWithPredicates(htmlAsset.assetGraph, htmlAsset))
        .map(function (stylesheetAndIncomingMedia) {
            return memoizedGetCssRulesByProperty(
                ALL_PROPS_TO_TRACE,
                stylesheetAndIncomingMedia.text,
                stylesheetAndIncomingMedia.predicates
            );
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

    var getComputedStyle = memoizeSync(function (node, idArray, predicates, parentTrace, pseudoElementName) {
        predicates = predicates || {};
        var localFontPropRules = Object.assign({}, fontPropRules);
        var result = {};

        // Stop condition. We moved above <HTML>
        if (!node.tagName) {
            ALL_PROPS_TO_TRACE.forEach(function (prop) {
                result[prop] = [ { value: INITIAL_VALUES[prop], predicates: predicates }];
            });
            return result;
        }

        if (node.getAttribute('style')) {
            var attributeStyles = memoizedGetCssRulesByProperty(ALL_PROPS_TO_TRACE, 'bogusselector { ' + node.getAttribute('style') + ' }', [], []);

            Object.keys(attributeStyles).forEach(function (prop) {
                if (attributeStyles[prop].length > 0) {
                    var concatRules = attributeStyles[prop].concat(localFontPropRules[prop]);
                    localFontPropRules[prop] = concatRules.sort(stylePropObjectComparator(concatRules));
                }
            });
        }

        var foundPseudoElement = false;

        function traceProp(prop, startIndex, predicates) {
            startIndex = startIndex || 0;

            for (var i = startIndex; i < localFontPropRules[prop].length; i += 1) {
                var declaration = localFontPropRules[prop][i];
                // Skip to the next rule if we are doing a trace where one of true predicates is already assumed false,
                // or one of the false predicates is already assumed true:
                if (Object.keys(declaration.predicates).some(function (predicate) {
                    return typeof predicates[predicate] === 'boolean' && declaration.predicates[predicate] !== predicates[predicate];
                })) {
                    continue;
                }

                // Style attributes always have a specificity array of [1, 0, 0, 0]
                var isStyleAttribute = declaration.specificityArray[0] === 1;
                var strippedSelector = !isStyleAttribute && stripPseudoClassesFromSelector(declaration.selector);
                var hasPseudoClasses = strippedSelector !== declaration.selector;
                var hasPseudoElement = false;

                if (!isStyleAttribute) {
                    var matchPseudoElement = strippedSelector.match(/^(.*?)::?(before|after|first-letter|first-line|placeholder)$/);
                    if (matchPseudoElement) {
                        hasPseudoElement = true;
                        // The selector ends with :before, :after, :first-letter, or :first-line
                        if (pseudoElementName === matchPseudoElement[2]) {
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

                if (!INHERITED[prop] && !hasPseudoElement && pseudoElementName) {
                    continue;
                }

                if (isStyleAttribute || node.matches(strippedSelector.replace(/ i\]/, ']'))) { // nwmatcher doesn't support the i flag in attribute selectors
                    if (hasPseudoElement) {
                        foundPseudoElement = true;
                    }
                    var hypotheticalValues;
                    if (declaration.value === 'inherit' || declaration.value === 'unset') {
                        hypotheticalValues = (parentTrace || getComputedStyle(node.parentNode, idArray.slice(0, -1), predicates))[prop];
                    } else if (prop === 'font-weight' && (declaration.value === 'lighter' || declaration.value === 'bolder')) {
                        hypotheticalValues = (parentTrace || getComputedStyle(node.parentNode, idArray.slice(0, -1), predicates))[prop].map(
                            inheritedHypotheticalValue => ({
                                value: inheritedHypotheticalValue.value + '+' + declaration.value,
                                predicates: inheritedHypotheticalValue
                            })
                        );
                    } else {
                        var value;
                        if (declaration.value === 'initial') {
                            value = INITIAL_VALUES[prop];
                        } else if (NAME_CONVERSIONS[prop] && NAME_CONVERSIONS[prop][declaration.value]) {
                            value = NAME_CONVERSIONS[prop][declaration.value];
                        } else if (prop === 'font-weight') {
                            value = Number(declaration.value);
                        } else if (prop === 'font-family') {
                            value = unquote(declaration.value);
                        } else if (prop !== 'content' || hasPseudoElement) {
                            // content: ... is not inherited, has to be applied directly to the pseudo element
                            value = declaration.value;
                        }

                        hypotheticalValues = [ { value: value, predicates: predicates } ];
                    }

                    var predicatesToVary = Object.keys(declaration.predicates);
                    if (!isStyleAttribute && hasPseudoClasses) {
                        predicatesToVary.push('selectorWithPseudoClasses:' + declaration.selector);
                    }
                    if (predicatesToVary.length > 0) {
                        var multipliedHypotheticalValues = [];
                        createPredicatePermutations(predicatesToVary, declaration.predicates).forEach(function (predicatePermutation) {
                            var predicatePermutationKeys = Object.keys(predicatePermutation);
                            if (predicatePermutationKeys.length === 0) {
                                return;
                            }
                            var predicatesForThisPermutation = combinePredicates([predicates, predicatePermutation]);
                            var predicatesOtherwise = combinePredicates([predicates, _.mapValues(predicatePermutation, value => !value)]);
                            if (predicatesForThisPermutation && Object.keys(declaration.predicates).every(function (predicate) {
                                return declaration.predicates[predicate] === predicatesForThisPermutation[predicate];
                            })) {
                                Array.prototype.push.apply(
                                    multipliedHypotheticalValues,
                                    hypotheticalValues.map(function (hypotheticalValue) {
                                        return {
                                            value: hypotheticalValue.value,
                                            predicates: predicatesForThisPermutation
                                        };
                                    })
                                );
                            }
                            if (predicatesOtherwise) {
                                Array.prototype.push.apply(
                                    multipliedHypotheticalValues,
                                    traceProp(prop, i + 1, predicatesOtherwise)
                                );
                            }
                        });
                        hypotheticalValues = multipliedHypotheticalValues;
                    }
                    return hypotheticalValues;
                }
            }

            if (nonInheritingTags.indexOf(node.tagName) === -1) {
                return (parentTrace || getComputedStyle(node.parentNode, idArray.slice(0, -1), predicates))[prop];
            } else {
                return [ { value: INITIAL_VALUES[prop], predicates: predicates }];
            }
        }

        ALL_PROPS_TO_TRACE.forEach(function (prop) {
            result[prop] = traceProp(prop, 0, predicates);
        });
        if (pseudoElementName && !foundPseudoElement) {
            // We're tracing a pseudo element, but didn't match any rules
            return;
        }
        return result;
    }, {
        argumentsStringifier: function (args) {
            if (args[3]) {
                // Bypass memoization if parentTrace is given
                return false;
            }
            // node, idArray, predicates, parentTrace, pseudoElementName
            return (
                args[1].join(',') + '\x1e' +
                (args[2] ? Object.keys(args[2]).map(function (key) {
                    return key + '\x1d' + args[2][key];
                }).join('\x1d') : '') +
                (args[4] || '')
            );
        }
    });

    return getComputedStyle;
}

function expandAnimations(computedStyle, keyframesDefinitions) {
    if (computedStyle['animation-name'].length > 0) {
        var isAnimatedByPropertyName = {'animation-name': true};
        computedStyle['animation-name'].forEach(function (animationNameValue) {
            keyframesDefinitions.forEach(function (keyframesDefinition) {
                if (keyframesDefinition.name === animationNameValue.value) {
                    keyframesDefinition.node.walkDecls(function (decl) {
                        if (ALL_PROPS_TO_TRACE.indexOf(decl.prop) !== -1) {
                            isAnimatedByPropertyName[decl.prop] = true;
                        }
                    });
                }
            });
        });
        var animatedPropertyNames = Object.keys(isAnimatedByPropertyName);
        if (animatedPropertyNames.length > 0) {
            // Create a 1-level deep copy with new value arrays so we can add more items
            // without mutating the caller's copy:
            computedStyle = Object.keys(computedStyle).reduce(
                (acc, prop) => (acc[prop] = [].concat(computedStyle[prop]), acc),
                {}
            );
            var extraValuesByProp = {};
            expandPermutations(computedStyle, animatedPropertyNames).forEach(function (permutation) {
                if (permutation['animation-name'].value !== 'none') {
                    keyframesDefinitions.forEach(function (keyframesDefinition) {
                        if (keyframesDefinition.name === permutation['animation-name'].value) {
                            var seenValuesByProp = {};
                            Object.keys(permutation).forEach(function (prop) {
                                seenValuesByProp[prop] = [ permutation[prop].value ];
                            });
                            keyframesDefinition.node.walkDecls(function (decl) {
                                if (ALL_PROPS_TO_TRACE.indexOf(decl.prop) !== -1) {
                                    seenValuesByProp[decl.prop].push(decl.value);
                                }
                            });
                            Object.keys(seenValuesByProp).forEach(function (prop) {
                                var values = seenValuesByProp[prop];
                                if (prop === 'font-weight') {
                                    // https://drafts.csswg.org/css-transitions/#animtype-font-weight
                                    var sortedValues = values.map(function (value) {
                                        return cssFontWeightNames[value] || parseInt(value, 10);
                                    }).sort();
                                    values = [];
                                    for (var fontWeight = sortedValues[0] ; fontWeight <= sortedValues[sortedValues.length - 1] ; fontWeight += 100) {
                                        values.push(fontWeight);
                                    }
                                }
                                values.forEach(function (value) {
                                    (extraValuesByProp[prop] = extraValuesByProp[prop] || []).push({
                                        value: value,
                                        predicates: permutation['animation-name'].predicates
                                    });
                                });
                            });
                        }
                    });
                }
            });
            Object.keys(extraValuesByProp).forEach(function (prop) {
                Array.prototype.push.apply(computedStyle[prop], extraValuesByProp[prop]);
            });
        }
    }
    return computedStyle;
}

function expandTransitions(computedStyle) {
    var fontWeightTransitions = computedStyle['transition-property'].filter(function (hypotheticalValue) {
        return /\b(?:font-weight|all)\b/.test(hypotheticalValue.value);
    });
    if (fontWeightTransitions.length > 0) {
        var hypotheticalFontWeightValuesInPseudoClassStates = computedStyle['font-weight'].filter(function (hypotheticalValue) {
            return Object.keys(hypotheticalValue.predicates).some(function (predicate) {
                return hypotheticalValue.predicates[predicate] && /^selectorWithPseudoClasses:/.test(predicate);
            });
        });
        if (hypotheticalFontWeightValuesInPseudoClassStates.length > 0) {
            var hypotheticalNonZeroTransitionDurations = computedStyle['transition-duration'].filter(function (hypotheticalValue) {
                return !/^\s*0s\s*(,\s*0s\s*)*$/.test(hypotheticalValue.value);
            });
            if (hypotheticalNonZeroTransitionDurations.length > 0) {
                var extraHypotheticalFontWeightValues = [];
                hypotheticalNonZeroTransitionDurations.forEach(function (transitionDuration) {
                    fontWeightTransitions.forEach(function (fontWeightTransition) {

                        hypotheticalFontWeightValuesInPseudoClassStates.forEach(function (hypotheticalFontWeightValueInPseudoClassStates) {
                            computedStyle['font-weight'].forEach(function (hypotheticalFontWeightValue) {
                                var fontWeight1 = cssFontWeightNames[hypotheticalFontWeightValue.value] || parseInt(hypotheticalFontWeightValue.value, 10);
                                var fontWeight2 = cssFontWeightNames[hypotheticalFontWeightValueInPseudoClassStates.value] || parseInt(hypotheticalFontWeightValueInPseudoClassStates.value, 10);
                                for (var fontWeight = Math.min(fontWeight1, fontWeight2) + 100 ; fontWeight < Math.max(fontWeight1, fontWeight2) ; fontWeight += 100) {
                                    // Explicitly don't include hypotheticalFontWeightValueInPseudoClassStates.predicates
                                    var combinedPredicates = combinePredicates([
                                        transitionDuration.predicates,
                                        fontWeightTransition.predicates,
                                        hypotheticalFontWeightValue.predicates
                                    ]);
                                    if (combinedPredicates) {
                                        extraHypotheticalFontWeightValues.push({
                                            value: fontWeight,
                                            predicates: combinedPredicates
                                        });
                                    }
                                }
                            });
                        });
                    });
                });
                if (extraHypotheticalFontWeightValues.length > 0) {
                    // Create a shallow copy and add the extra hypothetical font-weight values
                    computedStyle = Object.assign({}, computedStyle);
                    computedStyle['font-weight'] = computedStyle['font-weight'].concat(extraHypotheticalFontWeightValues);
                }
            }
        }
    }
    return computedStyle;
}

function expandListIndicators(computedStyle, counterStyles, possibleListItemNumbers, possibleCounterValuesByName) {
    computedStyle.text = computedStyle.text || [];
    for (var i = 0 ; i < computedStyle.display.length ; i += 1) {
        if (/\blist-item\b/.test(computedStyle.display[i].value)) {
            for (var j = 0 ; j < computedStyle['list-style-type'].length ; j += 1) {
                var listStyleType = computedStyle['list-style-type'][j].value;
                var predicates = combinePredicates([
                    computedStyle.display[i].predicates,
                    computedStyle['list-style-type'][j].predicates
                ]);
                if (predicates) {
                    if (/^['"]/.test(listStyleType)) {
                        computedStyle.text.push({
                            value: unescapeCssString(unquote(listStyleType)),
                            isListIndicator: true,
                            predicates: predicates
                        });
                    } else {
                        var found = false;
                        counterStyles.forEach(function (counterStyle) {
                            if (counterStyle.name === listStyleType) {
                                var combinedPredicates = combinePredicates([predicates, counterStyle.predicates]);
                                if (combinedPredicates) {
                                    found = true;
                                    computedStyle.text.push({
                                        value: getCounterCharacters(counterStyle, counterStyles, possibleListItemNumbers),
                                        isListIndicator: true,
                                        predicates: combinedPredicates
                                    });
                                }
                            }
                        });
                        if (!found) {
                            computedStyle.text.push({
                                value: possibleListItemNumbers
                                    .map(listItemNumber => counterRendererByListStyleType[listStyleType](listItemNumber) + '.')
                                    .join(''),
                                isListIndicator: true,
                                predicates: predicates
                            });
                        }
                    }
                }
            }
        }
    }
    return _.omit(computedStyle, '');
}

// null represents <br>
function normalizeTextNodeValues(textNodeValues, whiteSpaceValue) {
    return textNodeValues.map(
        textNodeValue => textNodeValue === null ?
            '\n' :
            (/^pre/i.test(whiteSpaceValue) ?
                textNodeValue :
                textNodeValue.replace(/\n/g, ' ')
            )
    ).join('');
}

// memoizedGetCssRulesByProperty is optional
function getTextByFontProperties(htmlAsset, memoizedGetCssRulesByProperty) {
    if (!htmlAsset || htmlAsset.type !== 'Html' || !htmlAsset.assetGraph) {
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

    var possibleNextListItemNumberStack = [[1]];
    var possibleCounterValuesByName = {};

    function adjustPossibleCountersAndListItemNumbers(computedStyle, isWithinConditionalCommentOrNoscript) {
        var numHypotheticalListItems = 0;
        computedStyle.display.forEach(function (hypotheticalDisplayValue) {
            if (/\blist-item\b/.test(hypotheticalDisplayValue.value)) {
                numHypotheticalListItems += 1;
            }
        });
        var nextPossibleCounterValuesByName = {};
        ['counter-reset', 'counter-set'].forEach(function (propertyName) {
            var values = _.uniq(computedStyle[propertyName].map(function (hypotheticalCounterResetValue) {
                return hypotheticalCounterResetValue.value;
            }));
            values.forEach(function (value) {
                var valueByCounterName = {};
                if (value !== 'none') {
                    var tokens = value.split(/\s+/);
                    for (var i = 0 ; i < tokens.length ; i += 1) {
                        var counterName = tokens[i];
                        var resetValue = 0;
                        if (/^-?\d+$/.test(tokens[i + 1])) {
                            resetValue = parseInt(tokens[i + 1], 10);
                            i += 1;
                        }
                        valueByCounterName[counterName] = resetValue;
                    }
                }
                Object.keys(valueByCounterName).forEach(function (counterName) {
                    (possibleCounterValuesByName[counterName] || [0]).forEach(function (possibleCounterValue) {
                        (nextPossibleCounterValuesByName[counterName] = nextPossibleCounterValuesByName[counterName] || [])
                            .push(valueByCounterName[counterName] + possibleCounterValue);
                    });
                });
                Object.keys(possibleCounterValuesByName).forEach(function (counterName) {
                    if (!valueByCounterName[counterName]) {
                        nextPossibleCounterValuesByName[counterName] = [].concat(possibleCounterValuesByName[counterName]);
                    }
                });
            });
        });

        possibleCounterValuesByName = nextPossibleCounterValuesByName;
        nextPossibleCounterValuesByName = {};

        var counterIncrementValues = _.uniq(computedStyle['counter-increment'].map(function (hypotheticalCounterIncrementValue) {
            return hypotheticalCounterIncrementValue.value;
        }));

        var counterIncrementByName = {};
        counterIncrementValues.forEach(function (counterIncrementValue) {
            if (counterIncrementValue !== 'none') {
                var tokens = counterIncrementValue.split(/\s+/);
                for (var i = 0 ; i < tokens.length ; i += 1) {
                    var counterName = tokens[i];
                    var increment = 1;
                    if (/^-?\d+$/.test(tokens[i + 1])) {
                        increment = parseInt(tokens[i + 1], 10);
                        i += 1;
                    }
                    counterIncrementByName[counterName] = increment;
                }
            }
        });

        Object.keys(counterIncrementByName).forEach(function (counterName) {
            (possibleCounterValuesByName[counterName] || [0]).forEach(function (possibleCounterValue) {
                (nextPossibleCounterValuesByName[counterName] = nextPossibleCounterValuesByName[counterName] || [])
                    .push(counterIncrementByName[counterName] + possibleCounterValue);
            });
        });
        Object.keys(possibleCounterValuesByName).forEach(function (counterName) {
            if (!counterIncrementByName[counterName]) {
                nextPossibleCounterValuesByName[counterName] = [].concat(possibleCounterValuesByName[counterName]);
            }
        });
        possibleCounterValuesByName = nextPossibleCounterValuesByName;
        Object.keys(possibleCounterValuesByName).forEach(function (counterName) {
            possibleCounterValuesByName[counterName] = _.uniq(possibleCounterValuesByName[counterName]);
        });
        if (numHypotheticalListItems > 0) {
            if (numHypotheticalListItems === computedStyle.display.length && !isWithinConditionalCommentOrNoscript) {
                possibleNextListItemNumberStack[possibleNextListItemNumberStack.length - 1] = possibleNextListItemNumberStack[possibleNextListItemNumberStack.length - 1].map(potentialPrecedingListItemCount => potentialPrecedingListItemCount + 1);
            } else {
                possibleNextListItemNumberStack[possibleNextListItemNumberStack.length - 1] = _.uniq(possibleNextListItemNumberStack[possibleNextListItemNumberStack.length - 1].concat(possibleNextListItemNumberStack[possibleNextListItemNumberStack.length - 1].map(potentialPrecedingListItemCount => potentialPrecedingListItemCount + 1)));
            }
        }
        return computedStyle;
    }

    var conditionalCommentStack = [];
    var noscriptStack = [];

    function expandComputedStyle(computedStyle) {
        return expandListIndicators(
            expandTransitions(
                expandAnimations(
                    computedStyle,
                    fontPropRules.keyframes
                )
            ),
            fontPropRules.counterStyles,
            possibleNextListItemNumberStack[possibleNextListItemNumberStack.length - 1],
            possibleCounterValuesByName
        );
    }

    function traceBeforeOrAfterPseudoElement(pseudoElementName, node, idArray) {
        var styledTexts = [];
        var computedStyle = getComputedStyle(node, idArray, {}, undefined, pseudoElementName);
        if (computedStyle) {
            computedStyle = expandComputedStyle(Object.assign({}, computedStyle));
            var expandedContents = [];
            // Multiply the hypothetical content values with the hypothetical quotes values:
            computedStyle.content.forEach(function (hypotheticalContent) {
                var hypotheticalValues = extractTextFromContentPropertyValue(hypotheticalContent.value, node, computedStyle.quotes, hypotheticalCounterStylesByName, possibleCounterValuesByName);
                hypotheticalValues.forEach(function (hypotheticalValue) {
                    hypotheticalValue.predicates = combinePredicates([hypotheticalValue.predicates, hypotheticalContent.predicates]);
                    if (hypotheticalValue.predicates) {
                        expandedContents.push(hypotheticalValue);
                    }
                });
            });
            computedStyle.text = expandedContents;
            var styledText = adjustPossibleCountersAndListItemNumbers(computedStyle, conditionalCommentStack.length > 0 || noscriptStack.length > 0);
            styledText.text = styledText.text.filter(function (hypotheticalText) {
                return hypotheticalText.value.length > 0;
            });
            if (styledText.text.length > 0) {
                styledTexts.push(styledText);
            }
            return styledTexts;
        }
    }

    function expandFirstLineAndFirstLetter(groupedStyledTexts, node, idArray) {
        ['first-line', 'first-letter'].forEach(function (pseudoElementName) {
            var additionalStyledTexts = [];
            // Whether there's a perfect overlap between the predicates of the existing styled texts we've "taken bites" of:
            var aligned = true;
            groupedStyledTexts.some(function (styledTextsInSection) {
                var allExhaustive = false;
                // Keep track of whether we have consumed all the required characters:
                var done = true;
                for (var i = 0 ; i < styledTextsInSection.length ; i += 1) {
                    var styledTextInSection = styledTextsInSection[i];
                    var thisExhaustive = Object.keys(styledTextInSection).every(
                        prop => arePredicatesExhaustive(styledTextInSection[prop].map(hypotheticalValue => hypotheticalValue.predicates)
                    ));
                    allExhaustive = allExhaustive || thisExhaustive;

                    var pseudoElementStyle = getComputedStyle(node, idArray.slice(0, -1), {}, styledTextInSection, pseudoElementName);
                    if (pseudoElementStyle) {
                        styledTextInSection.text.forEach(function (hypotheticalValue) {
                            var matchContent;
                            if (pseudoElementName === 'first-letter') {
                                matchContent = hypotheticalValue.value.match(/^(\s*"?\s*\w|\s*"\s*\w?)/);
                            } else {
                                // pseudoElementName === 'first-line'
                                matchContent = hypotheticalValue.value.match(/^([^\n]+)/);
                                done = false;
                            }
                            if (matchContent) {
                                var content = matchContent[1];
                                additionalStyledTexts.push(Object.assign({
                                    text: [ { value: content, predicates: hypotheticalValue.predicates } ]
                                }, pseudoElementStyle));
                                if (aligned) {
                                    if (pseudoElementName === 'first-letter') {
                                        hypotheticalValue.value = hypotheticalValue.value.substr(content.length);
                                    } else if (pseudoElementName === 'first-line') {
                                        done = hypotheticalValue.value.indexOf('\n') !== -1;
                                    }
                                }
                            } else {
                                done = false;
                            }
                        });
                    }
                }
                if (allExhaustive && done) {
                    // Short circuit -- no need to proceed to the next section
                    return true;
                } else if (!done) {
                    aligned = false;
                }
            });
            Array.prototype.unshift.apply(groupedStyledTexts[0], additionalStyledTexts);
        });
    }

    var styledTexts = [];

    (function traversePreOrder(node, idArray) {
        var textNodeValues = [];
        if (node.nodeType === node.TEXT_NODE) {
            // Include an actual hyphen when there's a soft hyphen:
            var textContent = node.nodeValue.trim().replace(/\xad/g, '-');
            if (textContent) {
                textNodeValues.push(textContent);
            }
        } else if (node.nodeType === node.COMMENT_NODE) {
            if (/^\s*\[if\s+!IE\s*\]\s*>\s*$/i.test(node.nodeValue)) {
                // Start of non-IE conditional comment where the markup is in the containing document:
                conditionalCommentStack.push(true);
            } else if (/^\s*<!\[\s*endif\s*\]\s*$/.test(node.nodeValue)) {
                // End of non-IE conditional comment where the markup is in the containing document:
                conditionalCommentStack.pop();
            } else {
                // See if this is a conditional comment where the markup is in the comment value:
                htmlAsset.outgoingRelations.some(function (relation) {
                    if (relation.type === 'HtmlConditionalComment' && relation.node === node) {
                        conditionalCommentStack.push(true);
                        var conditionalCommentDocument = relation.to.parseTree;
                        var isWithinBody = false;
                        for (var i = 0 ; i < conditionalCommentDocument.childNodes.length ; i += 1) {
                            var childNode = conditionalCommentDocument.childNodes[i];
                            // Don't proceed unless we're between
                            // <!--ASSETGRAPH DOCUMENT START MARKER--> and <!--ASSETGRAPH DOCUMENT END MARKER-->
                            if (childNode.nodeType === childNode.COMMENT_NODE) {
                                if (childNode.nodeValue === 'ASSETGRAPH DOCUMENT START MARKER') {
                                    isWithinBody = true;
                                    continue;
                                } else if (childNode.nodeValue === 'ASSETGRAPH DOCUMENT END MARKER') {
                                    break;
                                }
                            } else if (!isWithinBody) {
                                continue;
                            }
                            // Fake that the node in the conditional comment has the parent node of the comment as its parentNode
                            // so that the correct CSS selectors match:
                            Object.defineProperty(childNode, 'parentNode', {
                                configurable: true,
                                get() { return node.parentNode; }
                            });
                            Array.prototype.push.apply(textNodeValues, traversePreOrder(childNode, idArray.concat(i)));
                            delete childNode.parentNode;
                        }
                        conditionalCommentStack.pop();
                        // Short circuit
                        return true;
                    }
                });
            }
        } else if (node.nodeType === node.ELEMENT_NODE && excludedNodes.indexOf(node.tagName) === -1) {
            if (!idArray) {
                idArray = [0];
            }

            if (node.tagName === 'NOSCRIPT') {
                htmlAsset.outgoingRelations.some(function (relation) {
                    if (relation.type === 'HtmlNoscript' && relation.node === node) {
                        noscriptStack.push(true);
                        var noscriptDocument = relation.to.parseTree;
                        for (var i = 0 ; i < noscriptDocument.childNodes.length ; i += 1) {
                            var childNode = noscriptDocument.childNodes[i];
                            // Fake that the top-level node in the inline asset has the <noscript> as its parentNode
                            // so that the correct CSS selectors match:
                            Object.defineProperty(childNode, 'parentNode', {
                                configurable: true,
                                get() { return node; }
                            });
                            Array.prototype.push.apply(textNodeValues, traversePreOrder(childNode, idArray.concat(i)));
                            delete childNode.parentNode;
                        }
                        noscriptStack.pop();
                        // Short circuit
                        return true;
                    }
                });
            } else if (node.tagName === 'INPUT' && visualValueInputTypes.indexOf(node.type || 'text') !== -1) {
                // Inputs might have visual text, but don't have childNodes
                var inputValue = (node.value || '').trim();
                var inputPlaceholder = (node.placeholder || '').trim();

                if (inputValue) {
                    styledTexts.push(
                        expandComputedStyle(
                            Object.assign(
                                { text: [ { value: inputValue, predicates: {} } ] },
                                getComputedStyle(node, idArray)
                            )
                        )
                    );
                }

                if (inputPlaceholder) {
                    var computedStyle = getComputedStyle(node, idArray);
                    styledTexts.push(
                        expandComputedStyle(
                            Object.assign(
                                { text: [ { value: inputPlaceholder, predicates: {} } ] },
                                getComputedStyle(node, idArray, undefined, computedStyle, 'placeholder') || computedStyle
                            )
                        )
                    );
                }
            } else if (node.nodeType === node.ELEMENT_NODE) {
                if (node.constructor.name === 'HTMLBRElement') {
                    textNodeValues.push(null);
                } else {
                    const computedStyle = getComputedStyle(node, idArray);
                    styledTexts.push(
                        adjustPossibleCountersAndListItemNumbers(expandComputedStyle(
                            Object.assign(
                                { text: [ { value: '', predicates: {} } ] },
                                computedStyle
                            )
                        ), conditionalCommentStack.length > 0 || noscriptStack.length > 0)
                    );
                    possibleNextListItemNumberStack.push([1]);

                    var beforeStyledTexts = traceBeforeOrAfterPseudoElement('before', node, idArray);
                    var afterStyledTexts = traceBeforeOrAfterPseudoElement('after', node, idArray);

                    var childTextNodeValues = _.flatten([].slice.call(node.childNodes).map(
                        (childNode, i) => traversePreOrder(childNode, idArray.concat(i))
                    ));
                    var tracedTextNodes = [];
                    if (childTextNodeValues.length > 0) {
                        computedStyle['white-space'].forEach(function (hypotheticalValue) {
                            var normalizedText = normalizeTextNodeValues(childTextNodeValues, hypotheticalValue.value);
                            if (normalizedText) {
                                tracedTextNodes.push(
                                    expandComputedStyle(
                                        Object.assign(
                                            { text: [ { value: normalizedText, predicates: hypotheticalValue.predicates } ] },
                                            computedStyle
                                        )
                                    )
                                );
                            }
                        });
                    }
                    var groupedStyledTexts = _.compact([
                        beforeStyledTexts,
                        tracedTextNodes,
                        afterStyledTexts
                    ]);
                    expandFirstLineAndFirstLetter(groupedStyledTexts, node, idArray);
                    Array.prototype.push.apply(styledTexts, _.flattenDeep(groupedStyledTexts));
                    possibleNextListItemNumberStack.pop();
                }
            }
        }
        return textNodeValues;
    }(document.body.parentNode));

    // propsByText Before:
    // [
    //     {
    //         text: 'foo',
    //         props: {
    //             'font-family': [ { value: 'a', predicates: {...} }, { value: 'b', predicates: {...} }],
    //             'font-style': [ { value: 'normal', predicates: {...} } ],
    //             'font-weight': [ { value: 400, predicates: {...} }, { value: 700, predicates: {...} }]
    //         }
    //     },
    //     ...
    // ]

    var seenPermutationByKey = {};
    var multipliedStyledTexts = _.flatten(styledTexts.map(function (styledText) {
        return expandPermutations(styledText)
            .filter(function removeImpossibleCombinations(hypotheticalValueByProp) {
                return ALL_PROPS_TO_TRACE_AND_TEXT.every(function (prop) {
                    return Object.keys(hypotheticalValueByProp[prop].predicates).every(function (predicate) {
                        var predicateValue = hypotheticalValueByProp[prop].predicates[predicate];
                        return (predicateValue === false ||
                            ALL_PROPS_TO_TRACE_AND_TEXT.every(function (otherProp) {
                                return hypotheticalValueByProp[otherProp].predicates[predicate] !== false;
                            }));

                    });
                });
            })
            .map(function (hypotheticalValueByProp) {
                var props = {};
                ALL_PROPS_TO_TRACE_AND_TEXT.forEach(function (prop) {
                    props[prop] = hypotheticalValueByProp[prop].value;
                });
                // Apply text-transform:
                var textTransform = props['text-transform'];
                if (textTransform !== 'none' && !hypotheticalValueByProp.text.isListIndicator) {
                    if (textTransform === 'uppercase') {
                        props.text = props.text.toUpperCase();
                    } else if (textTransform === 'lowercase') {
                        props.text = props.text.toLowerCase();
                    } else if (textTransform === 'capitalize') {
                        props.text = capitalize.words(props.text);
                    }
                }
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
                    props: _.pick(styledText, FONT_PROPS)
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
