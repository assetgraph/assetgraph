const specificity = require('specificity');
const postcss = require('postcss');
const cssFontParser = require('css-font-parser');
const counterRendererByListStyleType = require('./counterRendererByListStyleType');

const INITIAL_VALUES = {
  // 'font-family': 'serif',
  'font-weight': 400,
  'font-style': 'normal'
};

function getCssRulesByProperty(properties, cssSource, existingPredicates) {
  if (!Array.isArray(properties)) {
    throw new Error('properties argument must be an array');
  }
  if (typeof cssSource !== 'string') {
    throw new Error('cssSource argument must be a string containing valid CSS');
  }
  existingPredicates = existingPredicates || {};

  const parseTree = postcss.parse(cssSource);

  const rulesByProperty = {
    counterStyles: [],
    keyframes: []
  };

  properties.forEach(property => {
    rulesByProperty[property] = [];
  });

  const activeMediaQueries = [];
  function getCurrentPredicates() {
    if (activeMediaQueries.length > 0) {
      const predicates = Object.assign({}, existingPredicates);
      activeMediaQueries.forEach(mediaQuery => {
        predicates['mediaQuery:' + mediaQuery] = true;
      });
      return predicates;
    } else {
      return existingPredicates;
    }
  }

  (function visit(node) {
    // Check for selector. We might be in an at-rule like @font-face
    if (node.type === 'decl' && node.parent.selector) {
      if (properties.includes(node.prop)) {
        // Split up combined selectors as they might have different specificity
        specificity
          .calculate(node.parent.selector)
          .forEach(specificityObject => {
            const isStyleAttribute =
              specificityObject.selector === 'bogusselector';
            rulesByProperty[node.prop].push({
              predicates: getCurrentPredicates(),
              selector: isStyleAttribute
                ? undefined
                : specificityObject.selector.trim(),
              specificityArray: isStyleAttribute
                ? [1, 0, 0, 0]
                : specificityObject.specificityArray,
              prop: node.prop,
              value: node.value,
              important: !!node.important
            });
          });
      } else if (
        node.prop === 'list-style' &&
        properties.includes('list-style-type')
      ) {
        // Shorthand
        let listStyleType;
        node.value.replace(
          /"((?:[^"]|\\.)*")|'((?:[^']|\\.)*)'|([^'"]+)/,
          ($0, doubleQuotedString, singleQuotedString, other) => {
            if (typeof doubleQuotedString === 'string') {
              listStyleType = doubleQuotedString;
            } else if (typeof singleQuotedString === 'string') {
              listStyleType = singleQuotedString;
            } else if (other) {
              other
                .trim()
                .split(' ')
                .forEach(otherFragment => {
                  if (counterRendererByListStyleType[otherFragment]) {
                    listStyleType = otherFragment;
                  }
                });
            }
          }
        );

        if (typeof listStyleType !== 'undefined') {
          // Split up combined selectors as they might have different specificity
          specificity
            .calculate(node.parent.selector)
            .forEach(specificityObject => {
              const isStyleAttribute =
                specificityObject.selector === 'bogusselector';

              rulesByProperty['list-style-type'].push({
                predicates: getCurrentPredicates(),
                selector: isStyleAttribute
                  ? undefined
                  : specificityObject.selector.trim(),
                specificityArray: isStyleAttribute
                  ? [1, 0, 0, 0]
                  : specificityObject.specificityArray,
                prop: 'list-style-type',
                value: listStyleType,
                important: !!node.important
              });
            });
        }
      } else if (
        node.prop === 'animation' &&
        properties.includes('animation-name')
      ) {
        // Shorthand
        const animationName = node.value.split(' ').pop();

        // Split up combined selectors as they might have different specificity
        specificity
          .calculate(node.parent.selector)
          .forEach(specificityObject => {
            const isStyleAttribute =
              specificityObject.selector === 'bogusselector';

            rulesByProperty['animation-name'].push({
              predicates: getCurrentPredicates(),
              selector: isStyleAttribute
                ? undefined
                : specificityObject.selector.trim(),
              specificityArray: isStyleAttribute
                ? [1, 0, 0, 0]
                : specificityObject.specificityArray,
              prop: 'animation-name',
              value: animationName,
              important: !!node.important
            });
          });
      } else if (node.prop === 'transition') {
        // Shorthand
        const transitionProperties = [];
        const transitionDurations = [];
        node.value.split(/\s*,\s*/).forEach(item => {
          const itemFragments = item.split(/\s+/);
          if (itemFragments.length > 0) {
            transitionProperties.push(itemFragments[0]);
          }
          if (itemFragments.length > 1) {
            transitionDurations.push(itemFragments[1]);
          }
        });

        // Split up combined selectors as they might have different specificity
        specificity
          .calculate(node.parent.selector)
          .forEach(specificityObject => {
            const isStyleAttribute =
              specificityObject.selector === 'bogusselector';
            if (properties.includes('transition-property')) {
              rulesByProperty['transition-property'].push({
                predicates: getCurrentPredicates(),
                selector: isStyleAttribute
                  ? undefined
                  : specificityObject.selector.trim(),
                specificityArray: isStyleAttribute
                  ? [1, 0, 0, 0]
                  : specificityObject.specificityArray,
                prop: 'transition-property',
                value: transitionProperties.join(', '),
                important: !!node.important
              });
            }
            if (properties.includes('transition-duration')) {
              rulesByProperty['transition-duration'].push({
                predicates: getCurrentPredicates(),
                selector: isStyleAttribute
                  ? undefined
                  : specificityObject.selector.trim(),
                specificityArray: isStyleAttribute
                  ? [1, 0, 0, 0]
                  : specificityObject.specificityArray,
                prop: 'transition-duration',
                value: transitionDurations.join(', '),
                important: !!node.important
              });
            }
          });
      } else if (node.prop === 'font') {
        // Shorthand
        let fontProperties = cssFontParser(node.value);

        // If the shorthand value was invalid we get null in return
        if (fontProperties === null) {
          return;
        }

        if (Array.isArray(fontProperties['font-family'])) {
          fontProperties['font-family'] = fontProperties['font-family']
            .map(function quoteIfNeeded(family) {
              if (!/^".*$|^'.*'$/.test(family) && family.includes(' ')) {
                return '"' + family + '"';
              }

              return family;
            })
            .join(', ');
        }

        fontProperties = Object.assign({}, INITIAL_VALUES, fontProperties);

        specificity
          .calculate(node.parent.selector)
          .forEach(specificityObject => {
            Object.keys(fontProperties).forEach(prop => {
              const value = fontProperties[prop];
              const isStyleAttribute =
                specificityObject.selector === 'bogusselector';

              if (Array.isArray(rulesByProperty[prop])) {
                rulesByProperty[prop].push({
                  predicates: getCurrentPredicates(),
                  selector: isStyleAttribute
                    ? undefined
                    : specificityObject.selector.trim(),
                  specificityArray: isStyleAttribute
                    ? [1, 0, 0, 0]
                    : specificityObject.specificityArray,
                  prop,
                  value,
                  important: !!node.important
                });
              }
            });
          });
      }
    } else if (node.type === 'atrule' && node.name === 'counter-style') {
      const props = {};
      node.nodes.forEach(childNode => {
        props[childNode.prop] = childNode.value;
      });
      rulesByProperty.counterStyles.push({
        name: node.params,
        predicates: getCurrentPredicates(),
        props
      });
    } else if (node.type === 'atrule' && node.name === 'keyframes') {
      rulesByProperty.keyframes.push({
        name: node.params,
        predicates: getCurrentPredicates(),
        node
      });
      return;
    }

    if (node.nodes) {
      if (node.name === 'media') {
        activeMediaQueries.push(node.params);
      }
      node.nodes.forEach(childNode => {
        visit(childNode);
      });
      if (node.name === 'media') {
        activeMediaQueries.pop();
      }
    }
  })(parseTree);

  // TODO: Collapse into a single object for duplicate values?

  return rulesByProperty;
}

module.exports = getCssRulesByProperty;
