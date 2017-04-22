var specificity = require('specificity');
var memoizeSync = require('memoizesync');
var postcss = require('postcss');

function eachDeclarationInParseTree(ruleOrStylesheet, lambda) {
    ruleOrStylesheet.nodes.forEach(function (node) {
        if (node.type === 'decl') {
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
        // Check for selector. We might be in an at-rule like @font-face
        if (properties.includes(node.prop) && node.parent.selector) {
            // Split up combined selectors as they might have different specificity
            specificity.calculate(node.parent.selector)
                .forEach(function (specificityObject) {
                    // TODO: What if there are multiple values?
                    // TODO: Shorthand properties?
                    var isStyleAttribute = specificityObject.selector === 'bogusselector';
                    rulesByProperty[node.prop].push({
                        selector: isStyleAttribute ? undefined : specificityObject.selector.trim(),
                        specificityArray: isStyleAttribute ? undefined : specificityObject.specificityArray,
                        prop: node.prop,
                        value: node.value,
                        styleAttribute: isStyleAttribute,
                        important: !!node.important
                    });
                });
        }
    });

    return rulesByProperty;
}

module.exports = memoizeSync(getCssRulesByProperty);
