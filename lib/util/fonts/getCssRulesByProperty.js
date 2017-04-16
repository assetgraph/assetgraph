var specificity = require('specificity');

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

function getCssRulesByProperty(properties, parseTree) {
    if (!Array.isArray(properties)) {
        throw new Error('properties argument must be an array');
    }

    if (!parseTree || !parseTree.nodes) {
        throw new Error('parseTree argument must be a postcss parse result');
    }

    var rulesByProperty = {};

    properties.forEach(function (property) {
        rulesByProperty[property] = [];
    });

    eachDeclarationInParseTree(parseTree, function (node) {
        if (properties.includes(node.prop)) {
            // Split up combined selectors as they might have different specificity
            specificity.calculate(node.parent.selector)
                .forEach(function (specificityObject) {
                    // TODO: What if there are multiple values?
                    // TODO: Shorthand properties?
                    rulesByProperty[node.prop].push({
                        selector: specificityObject.selector,
                        specificityArray: specificityObject.specificityArray,
                        prop: node.prop,
                        value: node.value,
                        inlineStyle: specificityObject.selector === 'bogusselector',
                        important: !!node.important
                    });
                });
        }
    });

    return rulesByProperty;
}

module.exports = getCssRulesByProperty;
