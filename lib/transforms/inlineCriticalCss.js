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

const postcss = require('postcss');
const stripDynamicPseudoClasses = require('../util/stripDynamicPseudoClasses');

function getDomNodesAboveFold(fold) {
  let currentNode = fold;
  const criticalNodes = [];

  while (currentNode) {
    if (currentNode.nodeType === 1) {
      criticalNodes.push(currentNode);
    }

    if (currentNode.tagName === 'BODY') {
      criticalNodes.push(currentNode.parentNode); // Lets get the <html> node in there as well
      break;
    }

    if (currentNode.previousSibling) {
      // Collect all child nodes of previous siblings
      if (currentNode.previousSibling.nodeType === 1) {
        criticalNodes.push(
          ...currentNode.previousSibling.querySelectorAll('*')
        );
      }

      currentNode = currentNode.previousSibling;
    } else {
      currentNode = currentNode.parentNode;
    }
  }

  return criticalNodes;
}

function getClonedAtRuleScaffold(rule, root, clonedAtRuleMap) {
  const cacheHit = clonedAtRuleMap.find(mapping => {
    if (mapping.original === rule) {
      return mapping.clone;
    }
  });

  if (cacheHit) {
    return cacheHit.clone;
  }

  const clonedRule = rule.clone();

  clonedRule.removeAll();

  clonedAtRuleMap.push({
    original: rule,
    clone: clonedRule
  });

  if (rule.parent.type === 'atrule') {
    const parentRule = getClonedAtRuleScaffold(
      rule.parent,
      root,
      clonedAtRuleMap
    );

    clonedRule.parent = parentRule;

    parentRule.nodes.push(clonedRule);
  } else {
    clonedRule.parent = root;
    root.nodes.push(clonedRule);
  }

  return clonedRule;
}

module.exports = () => {
  return function inlineCriticalCss(assetGraph) {
    const clonedAtRuleMap = [];
    // For each html page with <link> tags in <body> and not in <head>
    const pages = assetGraph
      .findAssets({ type: 'Html', isLoaded: true, isInline: false })
      .filter(page => {
        const relations = assetGraph.findRelations({
          type: 'HtmlStyle',
          from: page,
          to: { isInline: false }
        });

        if (relations.length === 0) {
          return false;
        }

        return relations.every(relation => relation.node.matches('body link'));
      });

    for (const page of pages) {
      // Find the first external HtmlStyle relation inside <body>
      const cssRelations = assetGraph.findRelations({
        type: 'HtmlStyle',
        from: page,
        to: { isInline: false }
      });

      const fold = cssRelations[0].node;

      // Traverse back up the DOM to find all elements to check critical CSS for
      const criticalNodes = getDomNodesAboveFold(fold);

      // Find all CSS included on the page
      const stylesheets = assetGraph
        .collectAssetsPreOrder(page, {
          to: { type: 'Css' }
        })
        .filter(asset => asset.type === 'Css');

      const criticalParseTree = postcss.parse('');

      for (const stylesheet of stylesheets) {
        // For each critical DOM-node, check if each style rule applies
        stylesheet.eachRuleInParseTree(cssRule => {
          if (!cssRule.selector) {
            return;
          }

          const nonPseudoSelector = stripDynamicPseudoClasses(cssRule.selector);
          const criticalMatch = criticalNodes.some(node => {
            let match;

            try {
              match = node.matches(nonPseudoSelector);
            } catch (err) {
              // jsdom doesn't understand this selector
            }

            return match;
          });

          // Collect all matching style rules that match critical DOM-nodes
          if (criticalMatch) {
            const clonedRule = cssRule.clone();

            if (cssRule.parent.type === 'atrule') {
              const parentRule = getClonedAtRuleScaffold(
                cssRule.parent,
                criticalParseTree,
                clonedAtRuleMap
              );

              clonedRule.parent = parentRule;

              parentRule.nodes.push(clonedRule);
            } else {
              clonedRule.parent = criticalParseTree;

              criticalParseTree.nodes.push(clonedRule);
            }
          }
        });
      }

      // Inline critical stylesheet in <head>
      if (criticalParseTree.nodes.length > 0) {
        if (page.parseTree.querySelector('html')) {
          page.addRelation(
            {
              type: 'HtmlStyle',
              to: { type: 'Css', parseTree: criticalParseTree }
            },
            'lastInHead'
          );
        } else {
          assetGraph.warn(
            new Error(
              `Cannot inline the critical CSS in ${
                page.urlOrDescription
              }, the page does not have an <html> element`
            )
          );
        }
      }
    }
  };
};
