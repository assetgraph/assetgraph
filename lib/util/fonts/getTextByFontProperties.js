var _ = require('lodash');
var getCssRulesByProperty = require('./getCssRulesByProperty');
var defaultStylesheet = require('./defaultStylesheet');
var stylePropObjectComparator = require('./stylePropObjectComparator');
var unquote = require('./unquote');
var memoizeSync = require('memoizesync');
var cssFontWeightNames = require('css-font-weight-names');
var cssPseudoElementRegExp = require('../cssPseudoElementRegExp');
var getPseudoElements = require('./getPseudoElements');
var cssPseudoClassRegExp = require('../cssPseudoClassRegExp');

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

var excludedNodes = ['HEAD', 'STYLE', 'SCRIPT'];

function getNodeIdArray(node) {
    var idArray = [];
    var currentNode = node;
    var childNodes;

    while (currentNode.parentNode) {
        childNodes = Array.prototype.slice.call(currentNode.parentNode.childNodes)
            .filter(function (node) {
                return node.nodeType === 1  && !(excludedNodes.includes(node.tagName));
            });

        idArray.push(childNodes.indexOf(currentNode));

        currentNode = currentNode.parentNode;
    }

    return idArray.reverse();
}

function getFontRulesWithDefaultStylesheetApplied(htmlAsset) {
    var stylesheets = htmlAsset.assetGraph.collectAssetsPreOrder(htmlAsset)
        .filter(function (asset) { return asset.isLoaded; })
        .filter(function (asset) {
            return asset.type === 'Css'
                && asset.isExternalizable === true; // exclude inline style attributes
        })
        .map(function (asset) { return asset.text; });

    var fontPropRules = [defaultStylesheet].concat(stylesheets)
        .map(function (stylesheet) {
            return getCssRulesByProperty(FONT_PROPS, stylesheet);
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

function getMemoizedElementStyleResolver(fontPropRules, availableWeights) {
    var nonInheritingTags = ['BUTTON', 'INPUT', 'OPTION', 'TEXTAREA'];

    var getComputedStyle = memoizeSync(function (node, idArray) {
        var localFontPropRules = Object.assign({}, fontPropRules);
        var props = Object.keys(fontPropRules);
        var result = {};

        // Stop condition. We moved above <HTML>
        if (!node.tagName) {
            props.forEach(function (prop) {
                result[prop] = [INITIAL_VALUES[prop]];
            });
            return result;
        }

        if (node.getAttribute('style')) {
            var attributeStyles = getCssRulesByProperty(FONT_PROPS, 'bogusselector { ' + node.getAttribute('style') + ' }');

            Object.keys(attributeStyles).forEach(function (prop) {
                if (attributeStyles[prop].length > 0) {
                    var concatRules = attributeStyles[prop].concat(localFontPropRules[prop]);
                    localFontPropRules[prop] = concatRules.sort(stylePropObjectComparator(concatRules));
                }
            });
        }

        function traceProp(prop, startIndex) {
            startIndex = startIndex || 0;

            for (var i = startIndex; i < localFontPropRules[prop].length; i += 1) {
                var declaration = localFontPropRules[prop][i];

                // Style attributes always have a specificity array of [1, 0, 0, 0]
                var isStyleAttribute = declaration.specificityArray[0] === 1;
                var selectorWithoutPseudoClasses = !isStyleAttribute && declaration.selector.replace(cssPseudoClassRegExp, '');

                // Pseudo elements are handled elsewhere, and Jsdom crashes if we execute a node.matches on this selector
                if (!isStyleAttribute && declaration.selector.match(cssPseudoElementRegExp)) {
                    continue;
                }

                if (isStyleAttribute || node.matches(selectorWithoutPseudoClasses)) {
                    var values = [declaration.value];

                    if (prop === 'font-weight' && ['lighter', 'bolder'].includes(declaration.value)) {
                        var inheritedWeight = getComputedStyle(node.parentNode, idArray.slice(0, -1))[prop];
                        if (declaration.value === 'lighter') {
                            values = [availableWeights[availableWeights.indexOf(inheritedWeight) - 1] || inheritedWeight];
                        }

                        if (declaration.value === 'bolder') {
                            values = [availableWeights[availableWeights.indexOf(inheritedWeight) + 1] || inheritedWeight];
                        }
                    }


                    if (declaration.value === 'inherit' || declaration.value === 'unset') {
                        values = getComputedStyle(node.parentNode, idArray.slice(0, -1))[prop];
                    }

                    if (declaration.value === 'initial') {
                        values = [INITIAL_VALUES[prop]];
                    }

                    if (NAME_CONVERSIONS[prop] && NAME_CONVERSIONS[prop][declaration.value]) {
                        values = [NAME_CONVERSIONS[prop][declaration.value]];
                    }

                    if (isStyleAttribute || selectorWithoutPseudoClasses === declaration.selector) {
                        return values;
                    } else {
                        return _.uniq(values.concat(traceProp(prop, i + 1)));
                    }

                }

            }

            if (!nonInheritingTags.includes(node.tagName)) {
                return getComputedStyle(node.parentNode, idArray.slice(0, -1))[prop];
            } else {
                return [INITIAL_VALUES[prop]];
            }
        }

        props.forEach(function (prop) {
            result[prop] = traceProp(prop);
        });

        // Unquote font-family value if there is one
        result['font-family'] = result['font-family'].map(unquote);

        // Always return font-weight as a number
        result['font-weight'] = result['font-weight'].map(Number);


        return result;
    });

    return getComputedStyle;
}

function getTextByFontProperties(htmlAsset, availableWeights) {
    if (!htmlAsset || htmlAsset.type !== 'Html'  || !htmlAsset.assetGraph) {
        throw new Error('htmlAsset must be a Html-asset and be in an assetGraph');
    }

    if (availableWeights && !Array.isArray(availableWeights)) {
        throw new Error('availableWeights must be an array of css font weights');
    }

    availableWeights = availableWeights || [];

    var fontPropRules = getFontRulesWithDefaultStylesheetApplied(htmlAsset);
    var getComputedStyle = getMemoizedElementStyleResolver(fontPropRules, availableWeights);

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
            if (node.tagName === 'INPUT' && visualValueInputTypes.includes(node.type || 'text')) {
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

                if (child.nodeType === 1 && !(excludedNodes.includes(child.tagName))) {
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
    //             'font-family': ['a', 'b'],
    //             'font-style': ['normal'],
    //             'font-weight': [400, 700]
    //         }
    //     },
    //     ...
    // ]

    // Expand into all permutations in case of multiple possible values:
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
        return expandPermutations(styledText)
            .map(function (props) {
                return {
                    text: styledText.text,
                    props: props
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
