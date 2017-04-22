var getCssRulesByProperty = require('./getCssRulesByProperty');
var defaultStylesheet = require('./defaultStylesheet');
var stylePropObjectComparator = require('./stylePropObjectComparator');
var memoizeSync = require('memoizesync');

var FONT_PROPS = [
    'font-family',
    'font-weight',
    'font-style'
];

var DEFAULTS = {
    'font-style': 'normal',
    'font-weight': 400,
    'font-family': 'serif'
};

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
    var getComputedStyle = memoizeSync(function (node, idArray) {
        var props = Object.keys(fontPropRules);
        var result = {};

        props.forEach(function (prop) {
            var match = fontPropRules[prop].find(function (rule) {
                return node.matches(rule.selector);
            });

            if (match) {
                result[prop] = match.value;
            } else if (node.parentNode && node.tagName !== 'BODY') {
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
    var excludedNodes = ['STYLE', 'SCRIPT'];

    (function traversePreOrder(node, idArray) {
        if (node.nodeType === 1) {
            if (!idArray) {
                idArray = [0];
            }

            var currentIndex = 0;
            var child = node.firstChild;

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
    }(document.body));

    var propsByTextNodes = textNodes.map(function (textNode) {
        return {
            text: textNode.node.textContent.trim(),
            props: getComputedStyle(textNode.node.parentNode, textNode.parentId)
        };
    });

    return propsByTextNodes;
}

module.exports = getTextByFontProperties;
