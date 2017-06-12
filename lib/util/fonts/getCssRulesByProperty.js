var specificity = require('specificity');
var memoizeSync = require('memoizesync');
var postcss = require('postcss');
var cssFontParser = require('css-font-parser');

var INITIAL_VALUES = {
    // 'font-family': 'serif',
    'font-weight': 400,
    'font-style': 'normal'
};

var SUPPORTED_SHORTHANDS = ['font'];

function eachDeclarationInParseTree(ruleOrStylesheet, lambda) {
    ruleOrStylesheet.nodes.forEach(function (node) {
        // Check for selector. We might be in an at-rule like @font-face
        if (node.type === 'decl' && node.parent.selector) {
            lambda(node);
        }

        // TODO: Filter by media type if it's an @media block?
        if (node.nodes) {
            eachDeclarationInParseTree(node, lambda);
        }
    });
}

function getCssRulesByProperty(properties, cssSource) {
    if (!Array.isArray(properties)) {
        throw new Error('properties argument must be an array');
    }

    if (typeof cssSource !== 'string') {
        throw new Error('cssSource argument must be a string containing valid CSS');
    }

    var parseTree = postcss.parse(cssSource);

    var rulesByProperty = {};

    properties.forEach(function (property) {
        rulesByProperty[property] = [];
    });

    eachDeclarationInParseTree(parseTree, function (node) {
        if (properties.includes(node.prop)) {
            // Split up combined selectors as they might have different specificity
            specificity.calculate(node.parent.selector)
                .forEach(function (specificityObject) {
                    var isStyleAttribute = specificityObject.selector === 'bogusselector';

                    rulesByProperty[node.prop].push({
                        selector: isStyleAttribute ? undefined : specificityObject.selector.trim(),
                        specificityArray: isStyleAttribute ? [1, 0, 0, 0] : specificityObject.specificityArray,
                        prop: node.prop,
                        value: node.value,
                        important: !!node.important
                    });
                });
        } else if (SUPPORTED_SHORTHANDS.includes(node.prop)) {
            var fontProperties = cssFontParser(node.value);

            // If the shorthand value was invalid we get null in return
            if (fontProperties === null) {
                return;
            }

            if (Array.isArray(fontProperties['font-family'])) {
                fontProperties['font-family'] = fontProperties['font-family']
                    .map(function quoteIfNeeded(family) {
                        if (family.includes(' ')) {
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

module.exports = memoizeSync(getCssRulesByProperty);
