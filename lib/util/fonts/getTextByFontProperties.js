var getCssRulesByProperty = require('./getCssRulesByProperty');
var defaultStylesheet = require('./defaultStylesheet');
var stylePropObjectComparator = require('./stylePropObjectComparator');
var unquote = require('./unquote');
var memoizeSync = require('memoizesync');
var cssFontWeightNames = require('css-font-weight-names');
var cssPseudoElementRegExp = require('../cssPseudoElementRegExp');
var getPseudoElements = require('./getPseudoElements');

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
                result[prop] = INITIAL_VALUES[prop];
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

        props.forEach(function (prop) {
            var match = localFontPropRules[prop].find(function (rule) {
                // Style attributes always have a specificity array of [1, 0, 0, 0]
                if (rule.specificityArray[0] === 1) {
                    return true;
                }

                // Jsdom throws on pseudoclass selectors
                if (rule.selector.match(cssPseudoElementRegExp)) {
                    return false;
                }

                return node.matches(rule.selector);
            });

            if (match) {
                if (prop === 'font-weight' && ['lighter', 'bolder'].includes(match.value)) {
                    var inheritedWeight = getComputedStyle(node.parentNode, idArray.slice(0, -1))[prop];
                    if (match.value === 'lighter') {
                        result[prop] = availableWeights[availableWeights.indexOf(inheritedWeight) - 1] || inheritedWeight;
                    }

                    if (match.value === 'bolder') {
                        result[prop] = availableWeights[availableWeights.indexOf(inheritedWeight) + 1] || inheritedWeight;
                    }
                    return;
                }

                if (match.value === 'inherit' || match.value === 'unset') {
                    result[prop] = getComputedStyle(node.parentNode, idArray.slice(0, -1))[prop];
                    return;
                }

                if (match.value === 'initial') {
                    result[prop] = INITIAL_VALUES[prop];
                    return;
                }

                if (NAME_CONVERSIONS[prop]) {
                    result[prop] = NAME_CONVERSIONS[prop][match.value] || match.value;
                    return;
                }

                result[prop] = match.value;
                return;
            }

            if (!nonInheritingTags.includes(node.tagName)) {
                result[prop] = getComputedStyle(node.parentNode, idArray.slice(0, -1))[prop];
            } else {
                result[prop] = INITIAL_VALUES[prop];
            }
        });

        // Unquote font-family value if there is one
        result['font-family'] = result['font-family'] && unquote(result['font-family']) || result['font-family'];

        // Always return font-weight as a number
        result['font-weight'] = Number(result['font-weight']);

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

    var propsByText = textNodes
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

    return propsByText;
}

module.exports = getTextByFontProperties;