/*
 * This transform works on an assumption about browser loading and rendering behavior of CSS:
 * When a browser loads CSS in <head> it render blocks untill all CSS in <head> has loaded.
 *
 * This might be slow.
 *
 * To appear faster, browsers will render what they have in buffer already if they meet a style <link> in <body>
 * before they dive into the render blocking load.
 * This lets you potentially inline critical css in <head> and put the bulk of your CSS "below the fold".
 * The effect will be a quick render with critical styles applied, just before the render blocking starts.
 *
 * We can leverage this behavior by letting the developer declaratively define their critical CSS if we
 * treat <body> <link> ad "the fold", assuming that everything above it is critical and should have styling applied
 * for the render flush that happens just before the <link> starts loading.
 *
 * Assetgraph can figure out what CSS to extract from the bundle and inline in <head> before the render blocking load starts.
 * This way the developer will only have to place the <link> at the relevant place in the DOM and not think any more about
 * builds and optimization.
 */

var postcss = require('postcss');

function getDomNodesAboveFold(fold) {
    var currentNode = fold.previousSibling || fold.parentNode;
    var criticalNodes = [];

    while (currentNode) {
        if (currentNode.nodeType === 1) {
            criticalNodes.push(currentNode);
        }

        if (currentNode.tagName === 'BODY') {
            break;
        }

        currentNode = currentNode.previousSibling || currentNode.parentNode;
    }

    return criticalNodes;
}

module.exports = function (options) {
    options = options || {};

    return function inlineCriticalCss(assetGraph) {
        // For each html page with <link> tags in <body> and not in <head>
        var pages = assetGraph.findAssets({ type: 'Html', isLoaded: true, isInline: false })
            .filter(function (page) {
                var nodes = assetGraph.findRelations({ type: 'HtmlStyle', from: page, isInline: false }, true)
                    .map(function (relation) { return relation.node; });

                return nodes.every(function (node) {
                    return node.matches('body link');
                });
            });

        pages.forEach(function (page) {
            // Find the first external HtmlStyle relation inside <body>
            var cssRelations = assetGraph.findRelations({ type: 'HtmlStyle', from: page, to: { isInline: false }}, true);
            var fold;

            if (cssRelations[0]) {
                fold = cssRelations[0].node;
            } else {
                return;
            }

            // Traverse back up the DOM to find all elements to check critical CSS for
            var criticalNodes = getDomNodesAboveFold(fold);

            // Find all CSS included on the page
            var stylesheets = assetGraph.collectAssetsPreOrder(page, {
                to: {
                    type: 'Css'
                }
            })
            .filter(function (asset) {
                return asset.type === 'Css';
            });


            var criticalParseTree = postcss.parse('');

            stylesheets.forEach(function (stylesheet) {
                // For each critical DOM-node, check if each style rule applies
                stylesheet.eachRuleInParseTree(function (cssRule) {
                    if (!cssRule.selector) {
                        return;
                    }

                    var criticalMatch = criticalNodes.some(function (node) {
                        var match;

                        try {
                            match = node.matches(cssRule.selector);
                        } catch (err) {
                            // jsdom doesn't understand this selector
                        }

                        return match;
                    });

                    // Collect all matching style rules that match critical DOM-nodes
                    if (criticalMatch) {
                        var clonedRule = cssRule.clone();
                        clonedRule.parent = criticalParseTree;

                        criticalParseTree.nodes.push(clonedRule);
                    }
                });
            });

            // Inline critical stylesheet in <head>
            if (criticalParseTree.nodes.length) {
                var criticalRelation = new assetGraph.HtmlStyle({
                    to: new assetGraph.Css({
                        parseTree: criticalParseTree
                    })
                });

                try {
                    criticalRelation.attachToHead(page, 'last');
                    assetGraph.addAsset(criticalRelation.to);
                } catch (err) {
                    if (err.message.match(/Missing <html> and <head>/)) {
                        assetGraph.emit('warn', err);
                    } else {
                        throw err;
                    }
                }
            }
        });

    };
};
