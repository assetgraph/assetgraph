var getCssRulesByProperty = require('./getCssRulesByProperty');
var defaultStylesheet = require('./defaultStylesheet');
var stylePropObjectComparator = require('./stylePropObjectComparator');
var memoizeSync = require('memoizesync');

var FONT_PROPS = [
    'font-family',
    'font-weight',
    'font-style'
];

// var DEFAULTS = {
//     'font-style': 'normal',
//     'font-weight': 400,
//     'font-family': 'serif'
// };

function getFontRulesWithDefaultStylesheetApplied(htmlAsset) {
    var stylesheets = htmlAsset.assetGraph.collectAssetsPreOrder(htmlAsset)
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

function getMemoizedElementStyleResolver(fontPropRules) {
    var nonInheritingTags = ['BUTTON', 'INPUT', 'OPTION', 'TEXTAREA'];

    var getComputedStyle = memoizeSync(function (node, idArray) {
        var localFontPropRules = Object.assign({}, fontPropRules);
        var props = Object.keys(fontPropRules);
        var result = {};

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

                return node.matches(rule.selector);
            });

            if (match && match.value !== 'inherit') {
                result[prop] = match.value;
            } else if (node.parentNode && node.tagName !== 'HTML' && ((match && match.value === 'inherit') || !nonInheritingTags.includes(node.tagName))) {
                result[prop] = getComputedStyle(node.parentNode, idArray.slice(0, -1))[prop];
            } else {
                result[prop] = undefined;
            }
        });

        return result;
    });

    return getComputedStyle;
}

function getTextByFontProperties(htmlAsset) {
    if (!htmlAsset || htmlAsset.type !== 'Html'  || !htmlAsset.assetGraph) {
        throw new Error('Argument must be a Html-asset and be in an assetGraph');
    }

    var fontPropRules = getFontRulesWithDefaultStylesheetApplied(htmlAsset);
    var getComputedStyle = getMemoizedElementStyleResolver(fontPropRules);

    var document = htmlAsset.parseTree;

    var textNodes = [];
    var nonTextnodes = [];
    var excludedNodes = ['HEAD', 'STYLE', 'SCRIPT'];
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
        .concat(nonTextnodes.map(function (nodeObj) {
            return {
                text: nodeObj.text,
                props: getComputedStyle(nodeObj.node, nodeObj.id)
            };
        }));

    return propsByText;
}

module.exports = getTextByFontProperties;
